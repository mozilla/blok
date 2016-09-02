const {canonicalizeHost} = require('./canonicalize')
const {loadLists, hostInBlocklist} = require('./lists')
const {requestAllower, getRequestEntity} = require('./requests')
const {log} = require('./log')

window.topFrameHostDisabled = false
window.topFrameHostReport = {}
var currentActiveTabID
var currentOriginDisabledIndex = -1
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

function setWindowFrameVarsForPopup (topHost, allowedHosts, reportedHosts) {
  if (isOriginDisabled(topHost, allowedHosts)) {
    window.topFrameHostDisabled = true
  } else {
    window.topFrameHostDisabled = false
  }
  if (reportedHosts.hasOwnProperty(topHost)) {
    window.topFrameHostReport = reportedHosts[topHost]
  } else {
    window.topFrameHostReport = {}
  }
}

function isOriginDisabled (host, allowedHosts) {
  return allowedHosts.indexOf(host) > -1
}

function blockTrackerRequests (blocklist, allowedHosts, entityList) {
  return function filterRequest (requestDetails) {
    var blockTrackerRequestsStart = Date.now()
    var requestTabID = requestDetails.tabId
    var originTopHost
    var requestTopHost
    var requestEntity

    var flags = {
      currentOriginDisabled: false,
      firefoxOrigin: false,
      newOrigin: false,
      requestHostInBlocklist: false,
      requestIsThirdParty: false,
      requestHostMatchesMainFrame: false
    }

    var allowRequest = requestAllower.bind(null, requestTabID, totalExecTime, blockTrackerRequestsStart)

    // undefined origins are browser internals (e.g., about:newtab)
    if (typeof requestDetails.originUrl === 'undefined') {
      return allowRequest()
    }

    // Determine all origin flags
    originTopHost = canonicalizeHost(new URL(requestDetails.originUrl).host)
    currentActiveOrigin = originTopHost
    currentOriginDisabledIndex = allowedHosts.indexOf(currentActiveOrigin)
    flags.currentOriginDisabled = currentOriginDisabledIndex > -1

    // Allow request originating from Firefox and/or new tab/window origins
    flags.firefoxOrigin = (typeof originTopHost !== 'undefined' && originTopHost.includes('moz-nullprincipal'))
    flags.newOrigin = originTopHost === ''
    if (flags.firefoxOrigin || flags.newOrigin) {
      return allowRequest()
    }

    // Set main & top frame values if frameId === 0
    if (requestDetails.frameId === 0) {
      mainFrameOriginTopHosts[requestTabID] = originTopHost
      if (flags.currentOriginDisabled) {
        browser.pageAction.setIcon({
          tabId: requestTabID,
          path: 'img/tracking-protection-disabled-16.png'
        })
      }
    }

    requestTopHost = canonicalizeHost(new URL(requestDetails.url).host)

    flags.requestHostInBlocklist = hostInBlocklist(blocklist, requestTopHost)

    // Allow requests to 3rd-party domains NOT in the block-list
    if (!flags.requestHostInBlocklist) {
      return allowRequest()
    }

    flags.requestIsThirdParty = requestTopHost !== originTopHost

    if (flags.requestIsThirdParty) {
      // Allow all requests to the main frame origin domain from child frames' pages
      flags.requestHostMatchesMainFrame = (requestDetails.frameId > 0 && requestTopHost === mainFrameOriginTopHosts[requestTabID])
      if (flags.requestHostMatchesMainFrame) {
        return allowRequest()
      }
      log(`requestTopHost: ${requestTopHost} does not match originTopHost: ${originTopHost}...`)

      requestEntity = getRequestEntity(entityList, originTopHost, requestTopHost, mainFrameOriginTopHosts[requestTabID])
      if (requestEntity.sameEntity) {
        return allowRequest()
      }

      // Allow request if the origin has been added to allowedHosts
      if (flags.currentOriginDisabled) {
        log('Protection disabled for this site; allowing request.')
        allowedRequests[requestTabID].push(requestTopHost)
        if (allowedEntities[requestTabID].indexOf(requestEntity.entityName) === -1) {
          allowedEntities[requestTabID].push(requestEntity.entityName)
        }
        browser.pageAction.show(requestTabID)
        return allowRequest()
      }

      blockedRequests[requestTabID].push(requestTopHost)
      if (blockedEntities[requestTabID].indexOf(requestEntity.entityName) === -1) {
        blockedEntities[requestTabID].push(requestEntity.entityName)
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
    return allowRequest()
  }
}

function startListeners ({blocklist, allowedHosts, entityList, reportedHosts}, testPilotPingChannel) {
  browser.webRequest.onBeforeRequest.addListener(
    blockTrackerRequests(blocklist, allowedHosts, entityList),
    {urls: ['*://*/*']},
    ['blocking']
  )

  browser.windows.onFocusChanged.addListener((windowID) => {
    log('browser.windows.onFocusChanged, windowID: ' + windowID)
    browser.tabs.query({active: true, windowId: windowID}, (tabsArray) => {
      let tab = tabsArray[0]
      currentActiveTabID = tab.id
      let tabTopHost = canonicalizeHost(new URL(tab.url).host)
      setWindowFrameVarsForPopup(tabTopHost, allowedHosts, reportedHosts)
    })
  })

  browser.tabs.onActivated.addListener(function (activeInfo) {
    currentActiveTabID = activeInfo.tabId
    browser.tabs.get(currentActiveTabID, function (tab) {
      let tabTopHost = canonicalizeHost(new URL(tab.url).host)
      setWindowFrameVarsForPopup(tabTopHost, allowedHosts, reportedHosts)
    })
  })

  browser.tabs.onUpdated.addListener(function (tabID, changeInfo) {
    if (changeInfo.status === 'loading') {
      restartBlokForTab(tabID)
      browser.tabs.get(currentActiveTabID, function (tab) {
        let tabTopHost = canonicalizeHost(new URL(tab.url).host)
        setWindowFrameVarsForPopup(tabTopHost, allowedHosts, reportedHosts)
      })
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
      let testPilotPingMessage = {
        originDomain: currentActiveOrigin,
        trackerDomains: blockedRequests[currentActiveTabID],
        event: 'blok-disabled',
        breakage: '',
        notes: ''
      }
      log('telemetry ping payload: ' + JSON.stringify(testPilotPingMessage))
      testPilotPingChannel.postMessage(testPilotPingMessage)
      browser.pageAction.setIcon({
        tabId: currentActiveTabID,
        path: 'img/tracking-protection-disabled-16.png'
      })
      allowedHosts.push(mainFrameOriginTopHosts[currentActiveTabID])
      browser.storage.local.set({allowedHosts: allowedHosts})
      browser.tabs.reload(currentActiveTabID)
    }
    if (message === 're-enable') {
      let testPilotPingMessage = {
        originDomain: currentActiveOrigin,
        trackerDomains: blockedRequests[currentActiveTabID],
        event: 'blok-enabled',
        breakage: '',
        notes: ''
      }
      log('telemetry ping payload: ' + JSON.stringify(testPilotPingMessage))
      testPilotPingChannel.postMessage(testPilotPingMessage)
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
        event: message.feedback,
        breakage: '',
        notes: ''
      }
      log('telemetry ping payload: ' + JSON.stringify(testPilotPingMessage))
      testPilotPingChannel.postMessage(testPilotPingMessage)
      browser.tabs.sendMessage(currentActiveTabID, {
        'feedback': message.feedback,
        'origin': mainFrameOriginTopHosts[currentActiveTabID]
      })
      reportedHosts[mainFrameOriginTopHosts[currentActiveTabID]] = {
        'feedback': message.feedback,
        'dateTime': Date.now()
      }
      browser.storage.local.set({reportedHosts: reportedHosts})
    }
    if (message.hasOwnProperty('breakage')) {
      let testPilotPingMessage = {
        originDomain: currentActiveOrigin,
        trackerDomains: blockedRequests[currentActiveTabID],
        event: 'submit',
        breakage: message.breakage,
        notes: message.notes
      }
      log('telemetry ping payload: ' + JSON.stringify(testPilotPingMessage))
      testPilotPingChannel.postMessage(testPilotPingMessage)
      browser.tabs.sendMessage(currentActiveTabID, message)
    }
  })
}

const state = {
  blocklist: new Map(),
  allowedHosts: [],
  reportedHosts: {},
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
