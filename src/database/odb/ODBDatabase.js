

/**
 * @imports
 */
import _Database from '../_Database.js';
import ODBStore from './ODBStore.js';

/**
 * ---------------------------
 * ODBDatabase class
 * ---------------------------
 */				

export default class ODBDatabase extends _Database {

    /**
     * Returns store names.
     * 
     * @return Array
     */
    async list() {
        return Object.keys(this.database);
    }
	 
	/**
	 * Opens a store.
     * 
     * @param String  storeName
     * @param String  mode
     * @param Object params
     * 
     * @return ODBStore
	 */
	open(storeName, mode = 'readonly', params = {}) {
		var store = this.database[storeName];
		params.mode = mode;
		return new ODBStore(store, storeName, this.schema[storeName], params);
	}
	
    /**
     * Creates a store
     * 
     * @param String  storeName
     * @param Object schema
     * @param Bool  replace
     * 
     * @return ODBStore
     */
    async _create(storeName, schema, replace) {
        var store = [];
        this.database[storeName] = store;
        if ((schema || []).length) {
            Object.values(schema).forEach(storeSchema => {
                if (!storeSchema.driver) {
                    storeSchema.driver = 'ODB';
                }
            });
        }
        return new ODBStore(store, this.schema[storeName]);
	}
	
    /**
     * Drops a store.
     * 
     * @param String  storeName
     * 
     * @return Bool
     */
    async _drop(storeName) {
        delete this.database[storeName];
        return true;
    }
}