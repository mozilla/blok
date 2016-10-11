const {canonicalizeHost} = require('./canonicalize')
const {loadLists, hostInBlocklist} = require('./lists')
const {requestAllower, getRequestEntity} = require('./requests')
const {log} = require('./log')

// Set some explicit window variable for pageAction to access
window.topFrameHostDisabled = false
window.topFrameHostReport = {}

var privateBrowsingMode = false
var currentActiveTabID
var currentActiveOrigin
var blockedRequests = {}
var blockedEntities = {}
var allowedRequests = {}
var allowedEntities = {}
var totalExecTime = {}
var mainFrameOriginDisabled = {}
var mainFrameOriginTopHosts = {}
var mainFrameOriginDisabledIndex = -1

function restartBlokForTab (tabID) {
  blockedRequests[tabID] = []
  blockedEntities[tabID] = []
  allowedRequests[tabID] = []
  allowedEntities[tabID] = []
  totalExecTime[tabID] = 0
  mainFrameOriginTopHosts[tabID] = null
  mainFrameOriginDisabled[tabID] = false
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
      mainOriginDisabled: false,
      firefoxOrigin: false,
      newOrigin: false,
      requestHostInBlocklist: false,
      requestIsThirdParty: false,
      requestHostMatchesMainFrame: false
    }

    var allowRequest = requestAllower.bind(null, requestTabID, totalExecTime, blockTrackerRequestsStart)

    if (privateBrowsingMode) {
      log('Allowing request in private browsing mode window; PBM TP will catch them.')
      return allowRequest()
    }

    if (typeof requestDetails.originUrl === 'undefined') {
      log('Allowing request from "undefined" origin - a browser internal origin.')
      return allowRequest()
    }

    // Determine all origin flags
    originTopHost = canonicalizeHost(new URL(requestDetails.originUrl).host)
    currentActiveOrigin = originTopHost

    flags.firefoxOrigin = (typeof originTopHost !== 'undefined' && originTopHost.includes('moz-nullprincipal'))
    flags.newOrigin = originTopHost === ''
    if (flags.firefoxOrigin || flags.newOrigin) {
      log('Allowing request from Firefox and/or new tab/window origins.')
      return allowRequest()
    }

    // Set main & top frame values if frameId === 0
    if (requestDetails.frameId === 0) {
      mainFrameOriginTopHosts[requestTabID] = originTopHost
      mainFrameOriginDisabledIndex = allowedHosts.indexOf(originTopHost)
      mainFrameOriginDisabled[requestTabID] = mainFrameOriginDisabledIndex > -1
    }

    requestTopHost = canonicalizeHost(new URL(requestDetails.url).host)

    if (mainFrameOriginDisabled[requestTabID]) {
      browser.pageAction.setIcon({
        tabId: requestTabID,
        path: 'img/tracking-protection-disabled-16.png'
      })
      browser.pageAction.show(requestTabID)
      allowedRequests[requestTabID].push(requestTopHost)
      /*
      if (allowedEntities[requestTabID].indexOf(requestEntity.entityName) === -1) {
        allowedEntities[requestTabID].push(requestEntity.entityName)
      }
      */
      log('Allowing request from origin for which Blok is disabled.')
      return allowRequest()
    }

    if (requestDetails.type === 'main_frame') {
      log('Allowing clicks to links.')
      return allowRequest()
    }

    flags.requestHostInBlocklist = hostInBlocklist(blocklist, requestTopHost)

    if (!flags.requestHostInBlocklist) {
      log('Allowing request to domain NOT in the block-list.')
      return allowRequest()
    }

    requestEntity = getRequestEntity(entityList, originTopHost, requestTopHost, originTopHost)
    if (requestEntity.sameEntity) {
      log('Allowing request to block-list domain that belongs to same entity as origin domain.')
      return allowRequest()
    }

    flags.requestIsThirdParty = requestTopHost !== originTopHost

    if (flags.requestIsThirdParty) {
      flags.requestHostMatchesMainFrame = (requestDetails.frameId > 0 && requestTopHost === mainFrameOriginTopHosts[requestTabID])
      if (flags.requestHostMatchesMainFrame) {
        log('Allowing request to block-list domain that matches the top/main frame domain.')
        return allowRequest()
      }

      log('Blocking request: originTopHost: ', originTopHost, ' mainFrameOriginTopHost: ', mainFrameOriginTopHosts[requestTabID], ' requestTopHost: ', requestTopHost, ' requestHostInBlocklist: ', flags.requestHostInBlocklist)
      blockedRequests[requestTabID].push(requestTopHost)
      if (blockedEntities[requestTabID].indexOf(requestEntity.entityName) === -1) {
        blockedEntities[requestTabID].push(requestEntity.entityName)
      }
      totalExecTime[requestTabID] += Date.now() - blockTrackerRequestsStart
      browser.pageAction.show(requestTabID)
      return {cancel: true}
    }

    log('Default to allowing request.')
    return allowRequest()
  }
}

function startRequestListener (blocklist, allowedHosts, entityList) {
  browser.webRequest.onBeforeRequest.addListener(
    blockTrackerRequests(blocklist, allowedHosts, entityList),
    {urls: ['*://*/*']},
    ['blocking']
  )
}

function startWindowAndTabListeners (allowedHosts, reportedHosts) {
  browser.windows.onFocusChanged.addListener((windowID) => {
    browser.windows.get(windowID, {}, (focusedWindow) => {
      if (focusedWindow.incognito) {
        privateBrowsingMode = true
      } else {
        privateBrowsingMode = false
      }
    })
    log('browser.windows.onFocusChanged, windowID: ' + windowID)
    browser.tabs.query({active: true, windowId: windowID}, (tabsArray) => {
      let tab = tabsArray[0]
      currentActiveTabID = tab.id
      let tabTopHost = canonicalizeHost(new URL(tab.url).host)
      mainFrameOriginDisabledIndex = allowedHosts.indexOf(tabTopHost)
      setWindowFrameVarsForPopup(tabTopHost, allowedHosts, reportedHosts)
    })
  })

  browser.tabs.onActivated.addListener(function (activeInfo) {
    currentActiveTabID = activeInfo.tabId
    browser.tabs.get(currentActiveTabID, function (tab) {
      let tabTopHost = canonicalizeHost(new URL(tab.url).host)
      mainFrameOriginDisabledIndex = allowedHosts.indexOf(tabTopHost)
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
      log('******** tab changeInfo.status complete ********')
      if (blockedRequests[tabID]) {
        log('blocked ' + blockedRequests[tabID].length + ' requests: ', blockedRequests[tabID])
        log('from ' + blockedEntities[tabID].length + ' entities: ', blockedEntities[tabID])
      }
      if (allowedRequests[tabID]) {
        log('allowed ' + allowedRequests[tabID].length + ' requests: ', allowedRequests[tabID])
        log('from ' + allowedEntities[tabID].length + ' entities: ', allowedEntities[tabID])
      }
      log('totalExecTime: ' + totalExecTime[tabID])
      log('******** tab changeInfo.status complete ********')
    }
  })
}

function startMessageListener (allowedHosts, reportedHosts, testPilotPingChannel) {
  browser.runtime.onMessage.addListener(function (message) {
    if (message === 'disable') {
      let mainFrameOriginTopHost = mainFrameOriginTopHosts[currentActiveTabID]
      let testPilotPingMessage = {
        originDomain: mainFrameOriginTopHost,
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
      allowedHosts.push(mainFrameOriginTopHost)
      browser.storage.local.set({allowedHosts: allowedHosts})
      browser.tabs.reload(currentActiveTabID)
    }
    if (message === 're-enable') {
      let mainFrameOriginTopHost = mainFrameOriginTopHosts[currentActiveTabID]
      let testPilotPingMessage = {
        originDomain: mainFrameOriginTopHost,
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

      // If there are multiple allowedHosts entries for minFrameOriginTopHost somehow,
      // splice them all out; https://github.com/mozilla/blok/issues/150
      let lastMainFrameOriginDisabledIndex = allowedHosts.lastIndexOf(mainFrameOriginTopHost)
      do {
        mainFrameOriginDisabledIndex = allowedHosts.indexOf(mainFrameOriginTopHost)
        allowedHosts.splice(mainFrameOriginDisabledIndex, 1)
        lastMainFrameOriginDisabledIndex = allowedHosts.lastIndexOf(mainFrameOriginTopHost)
      } while (mainFrameOriginDisabledIndex !== lastMainFrameOriginDisabledIndex)
      browser.storage.local.set({allowedHosts: allowedHosts})
      browser.tabs.reload(currentActiveTabID)
    }
    if (message.hasOwnProperty('feedback')) {
      let testPilotPingMessage = {
        originDomain: mainFrameOriginTopHosts[currentActiveTabID],
        trackerDomains: blockedRequests[currentActiveTabID],
        event: message.feedback,
        breakage: '',
        notes: ''
      }
      log('telemetry ping payload: ' + JSON.stringify(testPilotPingMessage))
      testPilotPingChannel.postMessage(testPilotPingMessage)
      reportedHosts[mainFrameOriginTopHosts[currentActiveTabID]] = message
      browser.storage.local.set({reportedHosts: reportedHosts})
      setWindowFrameVarsForPopup(currentActiveOrigin, allowedHosts, reportedHosts)
    }
    if (message.hasOwnProperty('breakage')) {
      let testPilotPingMessage = {
        originDomain: mainFrameOriginTopHosts[currentActiveTabID],
        trackerDomains: blockedRequests[currentActiveTabID],
        event: 'submit',
        breakage: message.breakage,
        notes: message.notes
      }
      log('telemetry ping payload: ' + JSON.stringify(testPilotPingMessage))
      testPilotPingChannel.postMessage(testPilotPingMessage)
    }
  })
}

function startListeners ({blocklist, allowedHosts, entityList, reportedHosts}, testPilotPingChannel) {
  startRequestListener(blocklist, allowedHosts, entityList)

  startWindowAndTabListeners(allowedHosts, reportedHosts)

  startMessageListener(allowedHosts, reportedHosts, testPilotPingChannel)
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
