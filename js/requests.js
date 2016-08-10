function requestAllower (tabID, totalExecTime, startDateTime) {
  totalExecTime[tabID] += Date.now() - startDateTime
  return {}
}

module.exports = {
  requestAllower
}
