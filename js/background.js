var {allHosts, canonicalizeHost} = require('./canonicalize')
const {loadLists} = require('./lists')
const {log} = require('./log')

var TESTPILOT_TELEMETRY_CHANNEL = 'testpilot-telemetry'
var testpilotPingChannel = new BroadcastChannel(TESTPILOT_TELEMETRY_CHANNEL)

// HACK: Start with active tab id = 1 when browser starts
var currentActiveTabID = 1
var currentOriginDisabledIndex = -1
var currentActiveOrigin
var blockedRequests = {}
var blockedEntities = {}
var allowedRequests = {}
var allowedEntities = {}
var totalExecTime = {}
var reasonsGiven = {}
var mainFrameOriginTopHosts = {}

function restartBlokForTab (tabID) {
  blockedRequests[tabID] = []
  blockedEntities[tabID] = []
  allowedRequests[tabID] = []
  allowedEntities[tabID] = []
  totalExecTime[tabID] = 0
  reasonsGiven[tabID] = null
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
      totalExecTime[requestTabID] += Date.now() - blockTrackerRequestsStart
      return {}
    }

    // Determine all origin flags
    originTopHost = canonicalizeHost(new URL(requestDetails.originUrl).host)
    currentActiveOrigin = originTopHost
    currentOriginDisabledIndex = allowedHosts.indexOf(currentActiveOrigin)

    if (requestDetails.frameId === 0) {
      mainFrameOriginTopHosts[requestTabID] = originTopHost
    }

    currentOriginDisabled = currentOriginDisabledIndex > -1
    firefoxOrigin = (typeof originTopHost !== 'undefined' && originTopHost.includes('moz-nullprincipal'))
    newOrigin = originTopHost === ''

    // Allow request originating from Firefox and/or new tab/window origins
    if (firefoxOrigin || newOrigin) {
      totalExecTime[requestTabID] += Date.now() - blockTrackerRequestsStart
      return {}
    }

    requestTopHost = canonicalizeHost(new URL(requestDetails.url).host)
    // check if any host from lowest-level to top-level is in the blocklist
    var allRequestHosts = allHosts(requestTopHost)
    for (let requestHost of allRequestHosts) {
      requestHostInBlocklist = blocklist.has(requestHost)
      if (requestHostInBlocklist) {
        break
      }
    }

    // Allow requests to 3rd-party domains NOT in the block-list
    if (!requestHostInBlocklist) {
      totalExecTime[requestTabID] += Date.now() - blockTrackerRequestsStart
      return {}
    }

    requestIsThirdParty = requestTopHost !== originTopHost

    if (requestIsThirdParty) {
      // Allow all requests to the main frame origin domain from child frames' pages
      requestHostMatchesMainFrame = (requestDetails.frameId > 0 && requestTopHost === mainFrameOriginTopHosts[requestTabID])
      if (requestHostMatchesMainFrame) {
        totalExecTime[requestTabID] += Date.now() - blockTrackerRequestsStart
        return {}
      }
      log(`requestTopHost: ${requestTopHost} does not match originTopHost: ${originTopHost}...`)

      for (let entityName in entityList) {
        var entity = entityList[entityName]
        var requestIsEntityResource = false
        var originIsEntityProperty = false
        var mainFrameOriginIsEntityProperty = false

        for (let requestHost of allHosts(requestTopHost)) {
          requestIsEntityResource = entity.resources.indexOf(requestHost) > -1
          if (requestIsEntityResource) {
            requestEntityName = entityName
            break
          }
        }
        for (let originHost of allHosts(originTopHost)) {
          originIsEntityProperty = entity.properties.indexOf(originHost) > -1
          if (originIsEntityProperty) {
            break
          }
        }

        for (let mainFrameOriginHost of allHosts(mainFrameOriginTopHosts[requestTabID])) {
          mainFrameOriginIsEntityProperty = entity.properties.indexOf(mainFrameOriginHost) > -1
          if (mainFrameOriginIsEntityProperty) {
            break
          }
        }

        if ((originIsEntityProperty || mainFrameOriginIsEntityProperty) && requestIsEntityResource) {
          log(`originTopHost ${originTopHost} and resource requestTopHost ${requestTopHost} belong to the same entity: ${entityName}; allowing request`)
          totalExecTime[requestTabID] += Date.now() - blockTrackerRequestsStart
          return {}
        }
      }

      // Allow request if the origin has been added to allowedHosts
      if (currentOriginDisabled) {
        log('Protection disabled for this site; allowing request.')
        browser.tabs.sendMessage(requestTabID,
          {
            'origin-disabled': originTopHost,
            'reason-given': reasonsGiven[requestTabID],
            'allowedEntities': allowedEntities[requestTabID]
          }
        )
        allowedRequests[requestTabID].push(requestTopHost)
        if (allowedEntities[requestTabID].indexOf(requestEntityName) === -1) {
          allowedEntities[requestTabID].push(requestEntityName)
        }
        return {}
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

      return {cancel: true}
    }

    // none of the above checks matched, so default to allowing the request
    totalExecTime[requestTabID] += Date.now() - blockTrackerRequestsStart
    return {}
  }
}

function startListeners ({blocklist, allowedHosts, entityList}) {
  browser.webRequest.onBeforeRequest.addListener(
    blockTrackerRequests(blocklist, allowedHosts, entityList),
    {urls: ['*://*/*']},
    ['blocking']
  )

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
      allowedHosts.push(currentActiveOrigin)
      browser.storage.local.set({allowedHosts: allowedHosts})
      browser.tabs.reload(currentActiveTabID)
    }
    if (message === 're-enable') {
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
      testpilotPingChannel.postMessage(testPilotPingMessage)
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
      testpilotPingChannel.postMessage(testPilotPingMessage)
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

loadLists(state).then(() => {
  startListeners(state)
}, console.error.bind(console))
