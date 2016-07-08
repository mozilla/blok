![Screenshot](https://raw.githubusercontent.com/groovecoder/blok/master/img/screenshot.png)
# Blok
[Web Extension](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/) re-implementation of [Tracking Protection for Firefox](https://support.mozilla.org/en-US/kb/tracking-protection-pbm).

We will run this add-on thru [Test Pilot experimentation](https://testpilot.firefox.com/experiments) to:

* Measure web content breakage
* Collect user feedback

When we have breakage data and user feedback, we will change the tracking protection implementation, so users get better web experience with tracking protection.

## Requirements

* Firefox 48+

## Run it

1. Go to `about:config` and set `xpinstall.signatures.required` to `false`
2. [Download the `.xpi`](https://github.com/mozilla/blok/raw/master/web-ext-artifacts/blok-0.1.xpi)
3. In Firefox, "Open File" and select the `.xpi`

When the add-on blocks tracker requests, you will see a Blok notification bar
like the screenshot.

## Development

### With `web-ext`

1. Clone this repo locally
2. [Install `web-ext`](https://github.com/mozilla/web-ext/#documentation) if
   you haven't already
3. `cd blok`
4. `web-ext run`
    

### Without `web-ext`

1. Clone this repo locally
2. Go to `about:debugging`
3. Click "Load Temporary Add-on"
4. Select this repo `manifest.json` file
