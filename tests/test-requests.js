var test = require('tape')
var {allowRequest} = require('../js/requests')

test('allowRequest returns {}', (t) => {
  t.plan(1)
  let tabID = 1
  let totalExecTime = {}
  totalExecTime[tabID] = 0
  t.deepEqual(allowRequest(tabID, totalExecTime, Date.now()), {})
})

test('allowRequest adds some ms to totalExecTime[tabID]', (t) => {
  t.plan(1)
  let tabID = 1
  let totalExecTime = {}
  totalExecTime[tabID] = 0
  allowRequest(tabID, totalExecTime, 0)
  t.ok(totalExecTime[tabID] > 0, 'added ms to totalExecTime[tabID]')
})
