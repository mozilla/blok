# METRICS

## Data Analysis
The collected data will primarily be used to answer the following questions.
Images are used for visualization and are not composed of actual data.

### Do people use this?

What is the overall engagement of Blok?  **This is the standard Daily Active User
(DAU) and Monthly Active User (MAU) analysis.**  This captures data from the
people who have the add-on installed, regardless of whether they are actively
interacting with it.

![](images/kpi-1.png)

### Immediate Questions

* On what sites are users reporting the most breakage?
  * How are those sites broken?
* Which trackers are most commonly involved with breakage?

### Follow-up Questions

* How might we fix sites that are reported as broken?
* Is there an anti-blocker on broken sites?
* What tracking techniques are the most common trackers using?
* How much time & bandwidth are users wasting with trackers?
* How often are users prompted about blocking and don't reply?

## Data Collection

### Server Side
There is currently no server side component to Blok.

### Client Side
Blok will use Test Pilot's Telemetry wrapper with no batching of data.  Details
of when pings are sent are below, along with examples of the `payload` portion
of a `testpilottest` telemetry ping for each scenario.

* The user clicks "Disable Blok for this site" button in the popup

```js
  {
    "originDomain": "www.redditmedia.com",
    "trackerDomains": ["ssl.google-analytics.com",
                       "z.moatads.com"],
    "breakage": "",
    "notes": "",
    "event": "blok-disabled"
  }
```

* The user clicks "Enable Blok for this site" button in the popup

```js
  {
    "originDomain": "www.redditmedia.com",
    "trackerDomains": ["ssl.google-analytics.com",
                       "z.moatads.com"],
    "breakage": "",
    "notes": "",
    "event": "blok-enabled"
  }
```

* The user clicks "This page works well" button in the popup

```js
  {
    "originDomain": "www.redditmedia.com",
    "trackerDomains": ["ssl.google-analytics.com",
                       "z.moatads.com"],
    "breakage": "",
    "notes": "",
    "event": "page-works"
  }
```

* The user clicks "Report a problem" button in the popup

```js
  {
    "originDomain": "www.redditmedia.com",
    "trackerDomains": ["ssl.google-analytics.com",
                       "z.moatads.com"],
    "breakage": "",
    "notes": "",
    "event": "page-problem"
  }
```

* The user submits a "breakage report" (which appears after they click the
  button that the page does not work)

```js
  {
    "originDomain": "www.redditmedia.com",
    "trackerDomains": ["ssl.google-analytics.com",
                       "z.moatads.com"],
    "breakage": "layout",  // or "images", "video", "buttons", "other"
    "notes": "",           // a free form text field from the user
    "event": "submit"
  }
```


A Redshift schema for the payload:

```lua
local schema = {
--   column name       field type   length  attributes   field name
    {"originDomain",   "VARCHAR",   255,    nil,         "Fields[payload.originDomain]"},
    {"trackerDomains", "VARCHAR",   1000,   nil,         "Fields[payload.trackerDomains]"},
    {"breakage",       "VARCHAR",   255,    nil,         "Fields[payload.breakage]"},
    {"notes",          "VARCHAR",   10000   nil,         "Fields[payload.notes]"},
    {"event",          "VARCHAR",   255,    nil,         "Fields[payload.event]"}
}
```

Valid data should be enforced on the server side:

* The `breakage` field MUST be either an empty string or one of "layout",
  "images", "video", "buttons", "other"

All Mozilla data is kept by default for 180 days and in accordance with our
privacy policies.
