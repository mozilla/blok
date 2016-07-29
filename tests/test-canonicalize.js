var test = require('tape')
var {canonicalizeHost} = require('../js/canonicalize')

test('canonicalizeHost plain host is plain', function (t) {
  t.plan(1)
  t.equal(canonicalizeHost('trackertest.org'), 'trackertest.org')
})

test('canonicalizeHost leading and trailing dots are trimmed', function (t) {
  t.plan(3)
  t.equal(canonicalizeHost('.trackertest.org'), 'trackertest.org')
  t.equal(canonicalizeHost('trackertest.org.'), 'trackertest.org')
  t.equal(canonicalizeHost('.trackertest.org.'), 'trackertest.org')
})

test('canonicalizeHost consecutive dots are consolidated', function (t) {
  t.plan(2)
  t.equal(canonicalizeHost('trackertest..org'), 'trackertest.org')
  t.equal(canonicalizeHost('track..trackertest..org'), 'track.trackertest.org')
})

test('canonicalizeHost ip4 addresses decimal, hex, and octal', function (t) {
  // OpenDNS as test addresses
  t.plan(3)
  // plain decimal
  t.equal(canonicalizeHost('208.67.222.222'), '208.67.222.222')
  // hex
  t.equal(canonicalizeHost('0xd0.0x43.0xde.0xde'), '208.67.222.222')
  // octal
  t.equal(canonicalizeHost('0320.0103.0336.0336'), '208.67.222.222')
})

test('canonicalizeHost lowercase everything', function (t) {
  t.plan(2)
  t.equal(canonicalizeHost('TrackerTest.Org'), 'trackertest.org')
  t.equal(canonicalizeHost('TRACKERTEST.ORG'), 'trackertest.org')
})

test('canonicalizeHost test everything together', function (t) {
  t.plan(1)
  t.equal(canonicalizeHost('..TRACK..TrackerTest.Org.'), 'track.trackertest.org')
})
