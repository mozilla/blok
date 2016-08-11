const {log} = require('./log')
const {hostInEntity} = require('./lists')

function requestAllower (tabID, totalExecTime, startDateTime) {
  totalExecTime[tabID] += Date.now() - startDateTime
  return {}
}

function getRequestEntity (entityList, originTopHost, requestTopHost, mainFrameOriginTopHost) {
  var requestEntityName
  let sameEntity = false
  for (let entityName in entityList) {
    var entity = entityList[entityName]
    var requestIsEntityResource = false
    var originIsEntityProperty = false
    var mainFrameOriginIsEntityProperty = false

    requestIsEntityResource = hostInEntity(entity.resources, requestTopHost)
    if (requestIsEntityResource) {
      requestEntityName = entityName
    }

    originIsEntityProperty = hostInEntity(entity.properties, originTopHost)

    mainFrameOriginIsEntityProperty = hostInEntity(entity.properties, mainFrameOriginTopHost)

    if ((originIsEntityProperty || mainFrameOriginIsEntityProperty) && requestIsEntityResource) {
      log(`originTopHost ${originTopHost} and resource requestTopHost ${requestTopHost} belong to the same entity: ${entityName}; allowing request`)
      sameEntity = true
    }
  }
  return {'entityName': requestEntityName, 'sameEntity': sameEntity}
}

module.exports = {
  requestAllower,
  getRequestEntity
}
