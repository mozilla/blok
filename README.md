# Blok

[![Build Status](https://travis-ci.org/mozilla/blok.svg?branch=master)](https://travis-ci.org/mozilla/blok)
[![Coverage
Status](https://coveralls.io/repos/github/mozilla/blok/badge.svg)](https://coveralls.io/github/mozilla/blok)

[Web Extension](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/) re-implementation of [Tracking Protection for Firefox](https://support.mozilla.org/en-US/kb/tracking-protection-pbm).

We will run this add-on thru [Test Pilot experimentation](https://testpilot.firefox.com/experiments) to:

* Measure web content breakage
* Collect user feedback

When we have breakage data and user feedback, we will change the tracking protection implementation, so users get better web experience with tracking protection.


## Requirements

* Firefox 48+


## Run it

1. [Download the latest `.xpi`](https://github.com/mozilla/blok/tree/master/web-ext-artifacts)
2. In Firefox, "Open File" and select the `.xpi`

When the add-on blocks tracker requests, you will see a Blok notification bar:

![Screenshot](docs/screenshot.png)


## Development

1. Clone this repo locally
2. `cd blok`
3. `npm install`
4. `npm run bundle`

### With `web-ext`

1. [Install `web-ext`](https://github.com/mozilla/web-ext/#documentation) if
   you haven't already
2. `web-ext run --firefox-binary {path to Firefox 49+ binary}`

### Without `web-ext`

1. Go to `about:config` and set `xpinstall.signatures.required` to `false`
2. Go to `about:debugging`
3. Click "Load Temporary Add-on"
4. Select this repo's `manifest.json` file


## Testing

Requires node 6+

`npm test`

## Distributing

To distribute, you will need AMO access credentials. See the `web-ext` docs.

1. Use [`web-ext
   sign`](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/web-ext_command_reference#web-ext_sign)
