var test = require('tape')
var {requestAllower, getRequestEntity} = require('../js/requests')

var entityListFixtureData = require('./entitylist-fixture.json')

test('allowRequest returns {}', (t) => {
  t.plan(1)
  let tabID = 1
  let totalExecTime = {}
  totalExecTime[tabID] = 0
  var allowRequest = requestAllower.bind(null, tabID, totalExecTime, Date.now())
  t.deepEqual(allowRequest(), {})
})

test('allowRequest adds some ms to totalExecTime[tabID]', (t) => {
  t.plan(1)
  let tabID = 1
  let totalExecTime = {}
  totalExecTime[tabID] = 0
  var allowRequest = requestAllower.bind(null, tabID, totalExecTime, 0)
  allowRequest()
  t.ok(totalExecTime[tabID] > 0, 'added ms to totalExecTime[tabID]')
})

test('getRequestEntity request to google.com from facebook.com returns Google and false', (t) => {
  t.plan(2)
  let requestEntity = getRequestEntity(entityListFixtureData, 'facebook.com', 'google.com', 'facebook.com')
  t.equal(requestEntity.entityName, 'Google')
  t.notOk(requestEntity.sameEntity)
})

test('getRequestEntity request to facebook.com from instagram.com returns Facebook and true', (t) => {
  t.plan(2)
  let requestEntity = getRequestEntity(entityListFixtureData, 'instagram.com', 'facebook.com', 'instagram.com')
  t.equal(requestEntity.entityName, 'Facebook')
  t.ok(requestEntity.sameEntity)
})

test('getRequestEntity request to facebook.com from github.io iframe on facebook.com returns Facebook and true', (t) => {
  t.plan(2)
  let requestEntity = getRequestEntity(entityListFixtureData, 'githhub.io', 'facebook.com', 'facebook.com')
  t.equal(requestEntity.entityName, 'Facebook')
  t.ok(requestEntity.sameEntity)
})
