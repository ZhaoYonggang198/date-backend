const logger = require('../utils/logger').logger('userStatus');
const ArangoDB = require('./arangoDb')
const config = require('../config');
const Collection = require('./userCollection').UserCollection
const aql = require('arangojs').aql

const db = new ArangoDB(config.arango.userInfo).database

class UserStatusCollection extends Collection {
  constructor (db, collection) {
    super(db, collection)
  }

  async getUserStatusListByTimeStamp (openid, start, end) {
    const query = aql`
      for doc in ${this.collection}
        sort doc.info.timestamp desc
        limit ${start}, ${end}
        let profile = UNSET(DOCUMENT(CONCAT("UserProfile/",doc._key)), "_id", "_rev")
        let object = doc._key
        let favorite = (for item in Favoriteship
          filter item.subject == ${openid} and item.object == object and item.status
          return item.status)
        let liking = (for item in Likeship
          filter item.subject == ${openid} and item.object == object and item.status
          return item.status)
        return {status: doc, profile, favorite: favorite[0], liking: liking[0]}
    `

    return await this.db.query(query).then(cursor => cursor.all())
      .then(doc => {
        logger.debug(`get user status list for ${this.collectionName} success: `)
        return doc
      },
      err => {
        logger.error(query)
        logger.error(`get user status list for ${this.collectionName} fail`)
        throw err;
      })  
  }
}

const userStatusCollection = new UserStatusCollection(db, 'UserStatus')

async function saveUserStatus (openid, userStatus) {
  return await userStatusCollection.createDocument(openid, userStatus)
}

async function getUserStatus (openid) {
  return await userStatusCollection.getDocument(openid)
}

async function getUserStatusList (openid, start, end) {
  return await userStatusCollection.getUserStatusListByTimeStamp(openid, start, end)
}

module.exports = {
  saveUserStatus,
  getUserStatus,
  getUserStatusList
}
