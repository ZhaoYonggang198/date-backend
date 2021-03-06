const logger = require('../utils/logger').logger('userCollection');
const aql = require('arangojs').aql

class UserCollection {
  constructor(db, collection) {
    this.db = db
    this.collection = db.collection(collection)
    this.collectionName = collection
  }

  async createDocument(openid, info) {
    const query = aql`
      UPSERT {_key: ${openid}}
      INSERT {_key: ${openid}, info: ${info}, dateCreated: DATE_ISO8601(DATE_NOW()), updates: 1}
      UPDATE {_key: ${openid}, info: ${info}, updates: OLD.updates + 1, dateUpdate: DATE_ISO8601(DATE_NOW())}
      IN ${this.collection}
      return NEW
    `

    return await this.db.query(query).then(cursor => cursor.next())
      .then(doc => {
        logger.debug(`create document for ${this.collectionName} success: ${JSON.stringify(doc)}`)
        return doc
      },
      err => {
        logger.error(`AQL is ${JSON.stringify(query)}`)
        logger.error(`create document for ${this.collectionName} fail ${err.message}`)
        throw(err)
      })
  }

  async updateDocument(openid, info) {
    const query = aql`
    UPSERT {_key: ${openid}}
    INSERT {_key: ${openid}, info: ${info}, dateCreated: DATE_ISO8601(DATE_NOW()), updates: 1}
    UPDATE {_key: ${openid}, info: ${info}, updates: OLD.updates + 1, dateUpdate: DATE_ISO8601(DATE_NOW())}
    IN ${this.collection}
    return NEW
    `

    return await this.db.query(query).then(cursor => cursor.next())
      .then(doc => {
        logger.debug(`update document for ${this.collectionName} success: ${JSON.stringify(doc)}`)
        return doc
      },
      err => {
        logger.error(`AQL is ${JSON.stringify(query)}`)
        logger.error(`update document for ${this.collectionName} fail ${err.message}`)
        throw(err)
      })  
  }

  async getDocument(openid) {
    try {
      const doc = await this.collection.document(openid)
      return doc
    } catch(err) {
      logger.error('get document error ', err.message)
      return null
    }
  }
}

module.exports = {
  UserCollection
}
