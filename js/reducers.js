const {log} = require('./log')

const activeTabReducer = function (state = {}, action) {
  log('activeTab reducer was called with ', state, action)
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return Object.assign({}, state, {currentActiveTabID: action.value})
    default:
      return state
  }
}

const hostReportReducer = function (state = {}, action) {
  log('hostReport reducer was called with ', state, action)
  switch (action.type) {
    case 'SET_HOST_REPORT':
      return Object.assign({}, state, {pageHostReport: action.value})
    default:
      return state
  }
}

module.exports = {
  activeTabReducer,
  hostReportReducer
}
