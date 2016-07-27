var test = require('tape')
var {processBlockListJSON} = require('../js/lists')

var blocklistFixtureData = require('./blocklist-fixture.json')

test('processBlockListJSON returns Map', (t) => {
  t.plan(2)
  let processedBlocklist = processBlockListJSON(blocklistFixtureData)
  t.ok(processedBlocklist instanceof Map, 'got an instance of Map')
  t.equal(processedBlocklist.size, 3, 'got Map with expected 3 keys')
})

test('processBlockListJSON removes content and legacy', (t) => {
  t.plan(4)
  let processedBlocklist = processBlockListJSON(blocklistFixtureData)

  t.ok(processedBlocklist.has('itisatracker.com'), 'kept Disconnect category')
  t.notOk(processedBlocklist.has('akamai.com'), 'dropped Content category')
  t.notOk(processedBlocklist.has('2mdn.net'), 'dropped Legacy Disconnect category')
  t.notOk(processedBlocklist.has('flickr.com'), 'dropped Legacy Content category')
})

test('processBlockListJSON adds main domain and individual domains', (t) => {
  t.plan(3)
  let processedBlocklist = processBlockListJSON(blocklistFixtureData)

  t.ok(processedBlocklist.has('https://itisatracker.com/'), 'added main domain')
  t.ok(processedBlocklist.has('itisatracker.com'), 'added alternative domain')
  t.ok(processedBlocklist.has('trackertest.org'), 'added alternative domain')
})
