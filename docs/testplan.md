# Test Pilot: Blok Add-on Test Plan

## ENVIRONMENTS:

| ENVIRONMENT | URL |
|:------------|:----|
| Development | http://testpilot.dev.mozaws.net/


## PREREQUISITES:

- Use Firefox 48 or later

## SCOPE:
- These tests are for the Test Pilot Blok Add-on, and do not cover testing Test Pilot or Add-ons
- These tests do not cover verification of Disconnect.me black or white lists
- These tests do not cover verification of reported problems.

## TESTS:


### Firefox <small>(ETA: 25m)</small>

1. Open Firefox (any channel with Firefox 48 or higher, _Release_ or _Nightly_).

1. Go to http://testpilot.dev.mozaws.net/

1. Install Test Pilot. After installation, select "Blok" Add-on and enable it.

1. Open a new tab and load http://cnn.com. 
	1. Verify that Blok header displays with text confirming it is enabled. 
	1. Verify Blok displays "Blocked trackers"
	1. Verify link to disable Blok displays
	1. Verify buttons display for "Page works well" and "Report a problem"

1. Disable Blok by clicking link
	1. Verify header updates to show Blok is disabled
	1. Verify option to re-enable Blok displays
	1. Refresh page, verify that Blok remains disabled

1. Enable Blok by clicking link
	1. Verify Blok header returns to enabled state
	1. Open http://cbs.com and verify that Blok header updates with tracker data

1. Click "This page works well."
	1. Verify header status updates to show you said this page works well.

1. Refresh page and click "Report a Problem"
	1. Verify Blok header refreshes and buttons display
	1. Verify Report a problem pop-up displays. 
	1. Select "Images" and click Submit button.
	1. Verify modal window disappears and Blok header displays "You reported a problem on this page."

1. Repeat process to report a problem for all Radio buttons, verify able to submit issues
1. Open Report a problem pop-up and click Cancel.
	1. Verify modal window disappears
	1. Repeat and close pop-up by clicking "x" close button
	1. Verify modal window disappears

1. Open https://youtube.com
	1. Verify Blok header does not display

1. Open Web Console, open different websites, enable/disable Blok, report issues. Verify no Blok errors occur.
