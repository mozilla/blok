const {log} = require('./log')
const {hostInEntity} = require('./lists')

let hostEntityCache = {}

function requestAllower (tabID, totalExecTime, startDateTime) {
  totalExecTime[tabID] += Date.now() - startDateTime
  return {}
}

function getRequestEntity (entityList, originTopHost, requestTopHost, mainFrameOriginTopHost) {
  let requestEntity = {'entityName': null, 'sameEntity': false}

  // First, try to return everything from memo-ized cache
  let requestEntityName = hostEntityCache[requestTopHost]
  let originEntityName = hostEntityCache[originTopHost]
  let mainFrameOriginEntityName = hostEntityCache[mainFrameOriginTopHost]
  requestEntity.sameEntity = (
    requestEntityName && (
      requestEntityName === originEntityName || requestEntityName === mainFrameOriginEntityName
    )
  )
  if (requestEntity.sameEntity) {
    requestEntity.entityName = requestEntityName
    log('returning from memo-ized cache: ', requestEntity)
    return requestEntity
  }

  // If a host was not found in the memo-ized cache, check thru the entityList
  for (let entityName in entityList) {
    let entity = entityList[entityName]
    let requestIsEntityResource = false
    let originIsEntityProperty = false
    let mainFrameOriginIsEntityProperty = false

    requestIsEntityResource = hostInEntity(entity.resources, requestTopHost)
    if (requestIsEntityResource) {
      requestEntity.entityName = entityName
      hostEntityCache[requestTopHost] = entityName
    }

    originIsEntityProperty = hostInEntity(entity.properties, originTopHost)
    if (originIsEntityProperty) {
      hostEntityCache[originTopHost] = entityName
    }

    mainFrameOriginIsEntityProperty = hostInEntity(entity.properties, mainFrameOriginTopHost)
    if (mainFrameOriginIsEntityProperty) {
      hostEntityCache[mainFrameOriginTopHost] = entityName
    }

    if ((originIsEntityProperty || mainFrameOriginIsEntityProperty) && requestIsEntityResource) {
      log(`originTopHost ${originTopHost} and resource requestTopHost ${requestTopHost} belong to the same entity: ${entityName}; allowing request`)
      requestEntity.sameEntity = true
      break
    }
  }
  // TODO: https://github.com/mozilla/blok/issues/110
  return requestEntity
}

module.exports = {
  requestAllower,
  getRequestEntity
}
