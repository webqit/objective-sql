

/**
 * @imports
 */
import _arrFrom from '@webqit/util/arr/from.js';
import _isNumeric from '@webqit/util/js/isNumeric.js';
import Driver from '../_Driver.js';
import IDBDatabase from './IDBDatabase.js';

/**
 * ---------------------------
 * IDBDriver class
 * ---------------------------
 */				

export default class IDBDriver extends Driver {

    /**
     * @inheritdoc
	 */
    constructor() {
        super();
        if (typeof indexedDB === 'undefined') {
            throw new Error('IndexedDB is not in scope.');
        }
        this.indexedDB = indexedDB;
        this.name = 'idb';
    }

	/**
     * Returns a list of databases.
     * 
     * @param String databaseName
     * @param Object params
     * 
     * @return Array
	 */
    async databases(databaseName = null, params = {}) {
        var databaseList = _arrFrom(await this.indexedDB.databases());
        return this.matchDatabaseList(databaseList, databaseName, params);
	}

	/**
     * Returns a database handle.
     * 
     * @param String databaseName
     * @param Object params
     * 
     * @return SQLDatabase
	 */
	async database(databaseName = this.defaultDB, params = this.defaultDBParams) {
		return new Promise(resolve => {
			var dbOpenRequest = this.indexedDB.open(databaseName, params.version || 0);
			dbOpenRequest.onsuccess = e => {
				resolve(new IDBDatabase(this, databaseName, {
                    database: e.target.result,
                }, params));
			};
		});
	}

    /**
     * CREATE/ALTER/DROP
     */

    /**
     * Creates.
     * 
     * @param String databaseName
     * @param Object params
     * 
     * @return Object
     */
    async createDatabase(databaseName, params = this.defaultDBParams) {
        if ((await this.databases(databaseName, params)).length) {
            if (params.ifNotExists) {
                return;
            }
            throw new Error(`Database ${databaseName} already exists.`);
        }
        return new Promise(resolve => {
            var dbOpenRequest = this.indexedDB.open(databaseName, params.version);
            // Define schema?
            if ((schema || []).length) {
                dbOpenRequest.onupgradeneeded = e => {
                    //databaseCreateSchema(e.target.result, schema);
                };
            }
            // Catch success
            dbOpenRequest.onsuccess = e => {
                // ----------------
                this.$.databases[databaseName] = {schema: {}, data: {}};
                // ----------------
                this.setDefaultDB(databaseName, params).then(() => {
                    resolve(new IDBDatabase(this, databaseName, {
                        database: e.target.result,
                        ...this.$.databases[databaseName]
                    }, params));
                });
            };
        });
    }

    /**
     * Initiates "alter DB".
     * 
     * @param String databaseName
     * @param Object params
     * @param Function callback
     * 
     * @return Any
	 */
    async alterDatabase(databaseName, params, callback) {
        if (!_isNumeric(params.version)) {
            throw new Error(`Database version (params.version) must be numeric.`);
        }
        if (!(await this.databases(databaseName, params.version)).length) {
            if (params.ifExists) {
                return;
            }
            throw new Error(`Database ${databaseName} does not exist.`);
        }
        return new Promise(resolve => {
            // Define schema
            var upgradeneededCalled, callbackReturn;
            var dbOpenRequest = this.indexedDB.open(databaseName, params.version);
            dbOpenRequest.onupgradeneeded = e => {
                upgradeneededCalled = true;
                callbackReturn = callback(e.target.result);
            };
            // Catch success
            dbOpenRequest.onsuccess = e => {
                if (!upgradeneededCalled) {
                    throw new Error(`Store name "${databaseName}@${params.version}" could not be accessed for modification!`);
                }
                resolve(callbackReturn);
            };
        });
    }

    /**
     * Drops a database.
     * 
     * @param String databaseName
     * @param Object params
     * 
     * @return Bool
     */
    async dropDatabase(databaseName, params = {}) {
        if (!(await this.databases(databaseName, params)).length) {
            if (params.ifExists) {
                return;
            }
            throw new Error(`Database ${databaseName} does not exist.`);
        }
        return new Promise(resolve => {
            var dbDeleteRequest = this.indexedDB.deleteDatabase(databaseName);
            // Catch success
            dbDeleteRequest.onsuccess = e => {
                // ----------------
                delete this.$.databases[databaseName];
                // ----------------
                resolve(true);
            };
        });
    }

    /**
     * ---------
     * QUERY
     * ---------
     */
	 
	/**
     * @inheritdoc
	 */
	async query(query, vars = [], params = {}) {
        params = {...params};
        params.vars = vars;
        params.dbDriver = this;
        return ObjSQL.parse(query, null, params).eval(this);
    }
}