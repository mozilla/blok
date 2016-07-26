function loadLists (state) {
  const blockListPromise = loadJSON('disconnect-blocklist.json').then((data) => {
    state.blocklist = processBlockListJSON(data)
  })

  const entityListPromise = loadJSON('disconnect-entitylist.json').then((data) => {
    state.entityList = data
  })

  const allowedHostsPromise = getAllowedHostsList().then((allowedHosts) => {
    state.allowedHosts = allowedHosts
  })

  return Promise.all([blockListPromise, entityListPromise, allowedHostsPromise])
}

function loadJSON (url) {
  return fetch(url)
    .then((res) => res.json())
}

function processBlockListJSON (data) {
  const blocklist = {}

  // remove un-needed categories per disconnect
  delete data.categories['Content']
  delete data.categories['Legacy Disconnect']
  delete data.categories['Legacy Content']

  // parse thru the disconnect blocklist and create
  // local blocklist "grouped" by main domain. I.e.,
  // blocklist["facebook.com"] = http://www.facebook.com
  // blocklist["fb.com"] = http://www.facebook.com
  // blocklist["doubleclick.net"] = http://www.google.com
  // blocklist["google-analytics.com"] = http://www.google.com
  // etc.
  for (let categoryName in data.categories) {
    var category = data.categories[categoryName]
    var entityCount = category.length

    for (var i = 0; i < entityCount; i++) {
      var entity = category[i]

      for (let entityName in entity) {
        var urls = entity[entityName]

        for (let mainDomain in urls) {
          blocklist[mainDomain] = []
          var domains = urls[mainDomain]
          var domainsCount = domains.length

          for (let j = 0; j < domainsCount; j++) {
            blocklist[domains[j]] = mainDomain
          }
        }
      }
    }
  }

  return blocklist
}

function getAllowedHostsList () {
  return browser.storage.local.get('allowedHosts').then((item) => {
    if (item.allowedHosts) {
      return item.allowedHosts
    }
    return []
  })
}

module.exports = {
  loadLists
}
