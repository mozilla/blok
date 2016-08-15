var {canonicalizeHost} = require('./canonicalize')
const {loadLists, hostInBlocklist, hostInEntity} = require('./lists')
const {allowRequest} = require('./requests')
const {log} = require('./log')

var currentActiveTabID
var currentOriginDisabledIndex = -1
window.topFrameHostDisabled = false
var currentActiveOrigin
var blockedRequests = {}
var blockedEntities = {}
var allowedRequests = {}
var allowedEntities = {}
var totalExecTime = {}
var mainFrameOriginTopHosts = {}

function restartBlokForTab (tabID) {
  blockedRequests[tabID] = []
  blockedEntities[tabID] = []
  allowedRequests[tabID] = []
  allowedEntities[tabID] = []
  totalExecTime[tabID] = 0
  mainFrameOriginTopHosts[tabID] = null
}

function blockTrackerRequests (blocklist, allowedHosts, entityList) {
  return function filterRequest (requestDetails) {
    var blockTrackerRequestsStart = Date.now()
    var requestTabID = requestDetails.tabId
    var originTopHost
    var requestTopHost

    // Start with all origin flags false
    var currentOriginDisabled = false
    var firefoxOrigin = false
    var newOrigin = false

    var requestEntityName
    var requestHostInBlocklist = false
    var requestIsThirdParty = false
    var requestHostMatchesMainFrame = false

    // undefined origins are browser internals (e.g., about:newtab)
    if (typeof requestDetails.originUrl === 'undefined') {
      return allowRequest(requestTabID, totalExecTime, blockTrackerRequestsStart)
    }

    // Determine all origin flags
    originTopHost = canonicalizeHost(new URL(requestDetails.originUrl).host)
    currentActiveOrigin = originTopHost
    currentOriginDisabledIndex = allowedHosts.indexOf(currentActiveOrigin)
    currentOriginDisabled = currentOriginDisabledIndex > -1
    if (requestDetails.frameId === 0) {
      mainFrameOriginTopHosts[requestTabID] = originTopHost
      if (currentOriginDisabled) {
        window.topFrameHostDisabled = true
        browser.pageAction.setIcon({
          tabId: requestTabID,
          path: 'img/tracking-protection-disabled-16.png'
        })
      } else {
        window.topFrameHostDisabled = false
      }
    }

    // Allow request originating from Firefox and/or new tab/window origins
    firefoxOrigin = (typeof originTopHost !== 'undefined' && originTopHost.includes('moz-nullprincipal'))
    newOrigin = originTopHost === ''
    if (firefoxOrigin || newOrigin) {
      return allowRequest(requestTabID, totalExecTime, blockTrackerRequestsStart)
    }

    requestTopHost = canonicalizeHost(new URL(requestDetails.url).host)

    requestHostInBlocklist = hostInBlocklist(blocklist, requestTopHost)

    // Allow requests to 3rd-party domains NOT in the block-list
    if (!requestHostInBlocklist) {
      return allowRequest(requestTabID, totalExecTime, blockTrackerRequestsStart)
    }

    requestIsThirdParty = requestTopHost !== originTopHost

    if (requestIsThirdParty) {
      // Allow all requests to the main frame origin domain from child frames' pages
      requestHostMatchesMainFrame = (requestDetails.frameId > 0 && requestTopHost === mainFrameOriginTopHosts[requestTabID])
      if (requestHostMatchesMainFrame) {
        return allowRequest(requestTabID, totalExecTime, blockTrackerRequestsStart)
      }
      log(`requestTopHost: ${requestTopHost} does not match originTopHost: ${originTopHost}...`)

      for (let entityName in entityList) {
        var entity = entityList[entityName]
        var requestIsEntityResource = false
        var originIsEntityProperty = false
        var mainFrameOriginIsEntityProperty = false

        requestIsEntityResource = hostInEntity(entity.resources, requestTopHost)
        if (requestIsEntityResource) {
          requestEntityName = entityName
        }

        originIsEntityProperty = hostInEntity(entity.properties, originTopHost)

        mainFrameOriginIsEntityProperty = hostInEntity(entity.properties, mainFrameOriginTopHosts[requestTabID])

        if ((originIsEntityProperty || mainFrameOriginIsEntityProperty) && requestIsEntityResource) {
          log(`originTopHost ${originTopHost} and resource requestTopHost ${requestTopHost} belong to the same entity: ${entityName}; allowing request`)
          return allowRequest(requestTabID, totalExecTime, blockTrackerRequestsStart)
        }
      }

      // Allow request if the origin has been added to allowedHosts
      if (currentOriginDisabled) {
        log('Protection disabled for this site; allowing request.')
        allowedRequests[requestTabID].push(requestTopHost)
        if (allowedEntities[requestTabID].indexOf(requestEntityName) === -1) {
          allowedEntities[requestTabID].push(requestEntityName)
        }
        browser.pageAction.show(requestTabID)
        return allowRequest(requestTabID, totalExecTime, blockTrackerRequestsStart)
      }

      blockedRequests[requestTabID].push(requestTopHost)
      if (blockedEntities[requestTabID].indexOf(requestEntityName) === -1) {
        blockedEntities[requestTabID].push(requestEntityName)
      }

      totalExecTime[requestTabID] += Date.now() - blockTrackerRequestsStart
      browser.tabs.sendMessage(requestTabID, {
        blockedRequests: blockedRequests[requestTabID],
        blockedEntities: blockedEntities[requestTabID]
      })

      browser.pageAction.show(requestTabID)
      return {cancel: true}
    }

    // none of the above checks matched, so default to allowing the request
    return allowRequest(requestTabID, totalExecTime, blockTrackerRequestsStart)
  }
}

function startListeners ({blocklist, allowedHosts, entityList}, testPilotPingChannel) {
  browser.webRequest.onBeforeRequest.addListener(
    blockTrackerRequests(blocklist, allowedHosts, entityList),
    {urls: ['*://*/*']},
    ['blocking']
  )

  browser.windows.onFocusChanged.addListener((windowID) => {
    log('browser.windows.onFocusChanged, windowID: ' + windowID)
    browser.tabs.query({active: true, windowId: windowID}, (tabsArray) => {
      currentActiveTabID = tabsArray[0].id
    })
  })

  browser.tabs.onActivated.addListener(function (activeInfo) {
    currentActiveTabID = activeInfo.tabId
  })

  browser.tabs.onUpdated.addListener(function (tabID, changeInfo) {
    if (changeInfo.status === 'loading') {
      restartBlokForTab(tabID)
    } else if (changeInfo.status === 'complete') {
      let actionRequests = (currentOriginDisabledIndex === -1) ? blockedRequests[tabID] : allowedRequests[tabID]
      let actionEntities = (currentOriginDisabledIndex === -1) ? blockedEntities[tabID] : allowedEntities[tabID]
      log('blocked ' + actionRequests.length + ' requests: ' + actionRequests)
      log('from ' + actionEntities.length + ' entities: ' + actionEntities)
      log('totalExecTime: ' + totalExecTime[tabID])
    }
  })

  browser.runtime.onMessage.addListener(function (message) {
    if (message === 'disable') {
      browser.pageAction.setIcon({
        tabId: currentActiveTabID,
        path: 'img/tracking-protection-disabled-16.png'
      })
      allowedHosts.push(mainFrameOriginTopHosts[currentActiveTabID])
      browser.storage.local.set({allowedHosts: allowedHosts})
      browser.tabs.reload(currentActiveTabID)
    }
    if (message === 're-enable') {
      browser.pageAction.setIcon({
        tabId: currentActiveTabID,
        path: 'img/tracking-protection-16.png'
      })
      allowedHosts.splice(currentOriginDisabledIndex, 1)
      browser.storage.local.set({allowedHosts: allowedHosts})
      browser.tabs.reload(currentActiveTabID)
    }
    if (message.hasOwnProperty('feedback')) {
      let testPilotPingMessage = {
        originDomain: currentActiveOrigin,
        trackerDomains: blockedRequests[currentActiveTabID],
        feedback: message.feedback
      }
      log('telemetry ping payload: ' + JSON.stringify(testPilotPingMessage))
      testPilotPingChannel.postMessage(testPilotPingMessage)
      log('mainFrameOriginTopHosts[currentActiveTabID]: ' + mainFrameOriginTopHosts[currentActiveTabID])
      browser.tabs.sendMessage(currentActiveTabID, {
        'feedback': message.feedback,
        'origin': mainFrameOriginTopHosts[currentActiveTabID]
      })
    }
    if (message.hasOwnProperty('breakage')) {
      let testPilotPingMessage = {
        originDomain: currentActiveOrigin,
        trackerDomains: blockedRequests[currentActiveTabID],
        breakage: message.breakage,
        notes: message.notes
      }
      log('telemetry ping payload: ' + JSON.stringify(testPilotPingMessage))
      testPilotPingChannel.postMessage(testPilotPingMessage)
      browser.tabs.sendMessage(currentActiveTabID, message)
    }
    if (message === 'close-toolbar') {
      browser.tabs.sendMessage(currentActiveTabID, message)
    }
    if (message === 'close-feedback') {
      browser.tabs.sendMessage(currentActiveTabID, message)
    }
  })
}

const state = {
  blocklist: new Map(),
  allowedHosts: [],
  entityList: {}
}

function initTestPilotPingChannel ({BroadcastChannel}) {
  let TESTPILOT_TELEMETRY_CHANNEL = 'testpilot-telemetry'
  let testPilotPingChannel = new BroadcastChannel(TESTPILOT_TELEMETRY_CHANNEL)
  return testPilotPingChannel
}

loadLists(state).then(() => {
  let testPilotPingChannel = initTestPilotPingChannel(window)
  startListeners(state, testPilotPingChannel)
}, console.error.bind(console))
