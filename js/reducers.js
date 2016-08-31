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

module.exports = {
  activeTabReducer
}
