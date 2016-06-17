![Screenshot](https://raw.githubusercontent.com/groovecoder/focus-addon/master/img/screenshot.png)
# focus-addon
[Web Extension](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/) re-implementation of [Tracking Protection for Firefox](https://support.mozilla.org/en-US/kb/tracking-protection-pbm).

We will run this add-on thru [Test Pilot experimentation](https://testpilot.firefox.com/experiments) to:

* Measure web content breakage
* Collect user feedback

When we have breakage data and user feedback, we will change the tracking protection implementation, so users get better web experience with tracking protection.

## Requirements

* Firefox 48+ for [Web Extensions WebRequest.onBeforeRequest details](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/WebRequest/onBeforeRequest#details) `originUrl` property

## Testing/Usage (for now)

1. Clone this repo locally
2. Go to `about:debugging`
3. Click "Load Temporary Add-on"
4. Select this repo `manifest.json` file
