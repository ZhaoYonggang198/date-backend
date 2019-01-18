const logger = require('../utils/logger').logger('GuestUser');
const ArangoDB = require('./arangoDb')
const config = require('../config');
const aql = require('arangojs').aql

const db = new ArangoDB(config.arango.userInfo).database

const collection = db.collection("UserHeard")

async function updateUserHeard(source, userid, heardid) {
  const query = aql`
    UPSERT {_key: ${source + userid}}
    INSERT {_key: ${source + userid}, logins: 1, first: DATE_ISO8601(DATE_NOW()), heard: [${heardid}], current: ${hearid}}
    UPDATE {_key: ${source + userid}, heard: PUSH(OLD.heard, ${heardid}, true), current: ${hearid}} in ${collection}
    return MERGE(UNSET(NEW, "_id", "_rev"), {status: UNSET(DOCUMENT(CONCAT("UserStatus/", NEW.current)), "_id", "_rev")})
  `
  return await db.query(query).then(cursor => cursor.next())
    .then(doc => {
      logger.debug('update Guest User Heard ', doc)
      return doc
    },
    err => {
      logger.error('update Guest User Heard fail', err.message)
      logger.error(err)
    })
}

async function getCurrentHeard(source, userid) {
  const query = aql`
    for doc in ${collection}
      filter doc._key == ${source+userid}
      let status = UNSET(DOCUMENT(CONCAT("UserStatus/",doc.current)), "_id", "_rev")
      return MERGE(UNSET(doc, "_id", "_rev"), {status})
  `
  return await db.query(query).then(cursor => cursor.next())
    .then(doc => {
      logger.debug('get Current Heard ', doc)
      return doc
    },
    err => {
      logger.error('get Current Heard fail', err.message)
      logger.error(err)
    })
}

async function getNextHeardInUserStatus(heard, sex) {
  const userStatusCollection = db.collection("UserStatus")
  const query = aql`
    for doc in ${userStatusCollection}
      filter ${heard} ALL != doc._key
      let profile = UNSET(DOCUMENT(CONCAT("UserProfile/",doc._key)), "_id", "_rev")
      filter ${sex} == 'unknown' or (${sex} == 'male' and profile.info.sex == 'female') or (${sex} == 'female' and profile.info.sex == 'male')
      SORT RAND()
      limit 1
      return doc
  `
  return await db.query(query).then(cursor => cursor.next())
    .then(doc => {
      logger.debug('getNextHeardInUserStatus ', doc)
      return doc
    },
    err => {
      logger.error('getNextHeardInUserStatus fail', err.message)
      logger.error(err)
    })

}

async function getNextHeard(source, userid, sex) {
  const userHeard = await collection.document(source+userid)
  const heard = userHeard ? userHeard.heard : []
  const nextheard = await getNextHeardInUserStatus(heard, sex)
  if (nextheard) {
    return await updateUserHeard(source, userid, nextheard._key)  
  } else {
    return {}
  }

}

async function getNextHeardForGuest(source, userid) {
  return await getNextHeard(source, userid, 'unknown')
}

async function getNextHeardForRegisted(source, userid, sex) {
  return await getNextHeard(source, userid, sex)
}

module.exports = {
  getCurrentHeard,
  getNextHeardForGuest,
  getNextHeardForRegisted
}