const {log} = require('./log')
const {hostInEntity} = require('./lists')

function requestAllower (tabID, totalExecTime, startDateTime) {
  totalExecTime[tabID] += Date.now() - startDateTime
  return {}
}

function getRequestEntity (entityList, originTopHost, requestTopHost, mainFrameOriginTopHost) {
  let requestEntityName = null
  let sameEntity = false
  for (let entityName in entityList) {
    let entity = entityList[entityName]
    let requestIsEntityResource = false
    let originIsEntityProperty = false
    let mainFrameOriginIsEntityProperty = false

    requestIsEntityResource = hostInEntity(entity.resources, requestTopHost)
    if (requestIsEntityResource) {
      requestEntityName = entityName
    }

    originIsEntityProperty = hostInEntity(entity.properties, originTopHost)

    mainFrameOriginIsEntityProperty = hostInEntity(entity.properties, mainFrameOriginTopHost)

    if ((originIsEntityProperty || mainFrameOriginIsEntityProperty) && requestIsEntityResource) {
      log(`originTopHost ${originTopHost} and resource requestTopHost ${requestTopHost} belong to the same entity: ${entityName}; allowing request`)
      sameEntity = true
      break
    }
  }
  // TODO: https://github.com/mozilla/blok/issues/110
  return {'entityName': requestEntityName, 'sameEntity': sameEntity}
}

module.exports = {
  requestAllower,
  getRequestEntity
}
