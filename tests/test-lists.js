var test = require('tape')
var {allHosts, processBlockListJSON, hostInBlocklist, hostInEntity} = require('../js/lists')

var blockListFixtureData = require('./blocklist-fixture.json')
var entityListFixtureData = require('./entitylist-fixture.json')

test('processBlockListJSON returns Map', (t) => {
  t.plan(2)
  let processedBlocklist = processBlockListJSON(blockListFixtureData)
  t.ok(processedBlocklist instanceof Map, 'got an instance of Map')
  t.equal(processedBlocklist.size, 3, 'got Map with expected 3 keys')
})

test('processBlockListJSON removes content and legacy', (t) => {
  t.plan(4)
  let processedBlocklist = processBlockListJSON(blockListFixtureData)

  t.ok(processedBlocklist.has('itisatracker.com'), 'kept Disconnect category')
  t.notOk(processedBlocklist.has('akamai.com'), 'dropped Content category')
  t.notOk(processedBlocklist.has('2mdn.net'), 'dropped Legacy Disconnect category')
  t.notOk(processedBlocklist.has('flickr.com'), 'dropped Legacy Content category')
})

test('processBlockListJSON adds main domain and individual domains', (t) => {
  t.plan(3)
  let processedBlocklist = processBlockListJSON(blockListFixtureData)

  t.ok(processedBlocklist.has('https://itisatracker.com/'), 'added main domain')
  t.ok(processedBlocklist.has('itisatracker.com'), 'added alternative domain')
  t.ok(processedBlocklist.has('trackertest.org'), 'added alternative domain')
})

test('allHosts returns single element for trackertest.org', function (t) {
  t.plan(1)
  t.deepEqual(allHosts('trackertest.org'), ['trackertest.org'])
})

test('allHosts returns multiple elements for tracky.track.trackertest.org', function (t) {
  t.plan(1)
  t.deepEqual(
    allHosts('tracky.track.trackertest.org'),
    [
      'tracky.track.trackertest.org',
      'track.trackertest.org',
      'trackertest.org'
    ]
  )
})

test('hostInBlocklist returns true for plain itisatracker.com', function (t) {
  t.plan(1)
  let processedFixtureBlocklist = processBlockListJSON(blockListFixtureData)
  t.ok(hostInBlocklist(processedFixtureBlocklist, 'itisatracker.com'))
})

test('hostInBlocklist returns true for tracky.itisatracker.com', function (t) {
  t.plan(1)
  let processedFixtureBlocklist = processBlockListJSON(blockListFixtureData)
  t.ok(hostInBlocklist(processedFixtureBlocklist, 'tracky.itisatracker.com'))
})

test('hostInBlocklist returns false for plain itisacdn.com', function (t) {
  t.plan(1)
  let processedFixtureBlocklist = processBlockListJSON(blockListFixtureData)
  t.notOk(hostInBlocklist(processedFixtureBlocklist, 'itisacdn.com'))
})

test('hostInBlocklist returns false for plain region.itisacdn.com', function (t) {
  t.plan(1)
  let processedFixtureBlocklist = processBlockListJSON(blockListFixtureData)
  t.notOk(hostInBlocklist(processedFixtureBlocklist, 'region.itisacdn.com'))
})

test('hostInEntity for entity.properties', function (t) {
  t.plan(4)
  t.ok(hostInEntity(entityListFixtureData.Facebook.properties, 'facebook.com'), 'facebook.com is in Facebook entity properties')
  t.ok(hostInEntity(entityListFixtureData.Facebook.properties, 'sub.instagram.com'), 'sub.instagram.com is in Facebook entity properties')
  t.notOk(hostInEntity(entityListFixtureData.Facebook.properties, 'google.com'), 'google.com is NOT in Facebook entity properties')
  t.notOk(hostInEntity(entityListFixtureData.Facebook.properties, 'player.ingress.com'), 'player.ingress.com is NOT in Facebook entity properties')
})

test('hostInEntity for entity.resources', function (t) {
  t.plan(4)
  t.ok(hostInEntity(entityListFixtureData.Facebook.resources, 'akamaihd.net'), 'akamaihd.net is in Facebook entity resources')
  t.ok(hostInEntity(entityListFixtureData.Facebook.resources, 'sub.akamaihd.net'), 'sub.akamaihd.net is in Facebook entity resources')
  t.notOk(hostInEntity(entityListFixtureData.Facebook.resources, 'twimg.com'), 'twimg.com is NOT in Facebook entity resources')
  t.notOk(hostInEntity(entityListFixtureData.Facebook.properties, 'user.twimg.com'), 'user.twimg.com is NOT in Facebook entity resources')
})
