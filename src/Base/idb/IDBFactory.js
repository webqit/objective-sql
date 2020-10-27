

/**
 * @imports
 */
import _Factory from '../_Factory.js';
import _arrFrom from '@onephrase/util/arr/from.js';
import IDBDatabase, { databaseCreateStores } from './IDBDatabase.js';
import Rql from '../../index.js';

/**
 * ---------------------------
 * IDBFactory class
 * ---------------------------
 */				

export default class IDBFactory extends _Factory {

    /**
     * ---------
     * QUERY
     * ---------
     */
	 
	/**
     * @inheritdoc
	 */
	static async _query(query, params = {}) {
        params.DB_FACTORY = this;
        return Rql.parse(query, null, params).eval(this);
    }

    /**
     * ---------
     * API
     * ---------
     */

    /**
     * Returns a list of database definitions.
     * 
     * @inheritdoc
     */
    static async list() {
		assertIndexedDBSupport();
        return _arrFrom(await indexedDB.databases());
    }
	 
	/**
	 * Opens a database.
	 * 
	 * @inheritdoc
	 */
	static open(databaseName = this.defaultDB, version = 1) {
        assertIndexedDBSupport();
		return new Promise(resolve => {
			var dbOpenRequest = indexedDB.open(databaseName, version);
			dbOpenRequest.onsuccess = e => {
				resolve(new IDBDatabase(e.target.result, this.schema[databaseName]));
			};
		});
	}

    /**
     * ---------
     * DATABASE
     * ---------
     */

    /**
     * Drops a database.
     * 
     * @inheritdoc
     */
    static _create(databaseName, schema, replace = false) {
        assertIndexedDBSupport();
        return new Promise(resolve => {
            var dbOpenRequest = indexedDB.open(databaseName);
            // Define schema?
            if ((schema || []).length) {
                dbOpenRequest.onupgradeneeded = e => {
                    databaseCreateStores(e.target.result, schema);
                };
            }
            // Catch success
            dbOpenRequest.onsuccess = e => resolve(new IDBDatabase(e.target.result, this.schema[databaseName]));
        });
    }

    /**
     * Drops a database.
     * 
     * @inheritdoc
     */
    static _drop(databaseName) {
        assertIndexedDBSupport();
        return new Promise(resolve => {
            var dbDeleteRequest = indexedDB.deleteDatabase(databaseName);
            // Catch success
            dbDeleteRequest.onsuccess = e => resolve(true);
        });
    }
};

// ----------------------------

const assertIndexedDBSupport = () => {
	if (typeof indexedDB === 'undefined') {
		throw new Error('IndexedDB is not available in the current environment.')
	}
};
