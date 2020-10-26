

/**
 * @imports
 */
import _Database from '../_Database.js';
import OBJStore from './OBJStore.js';

/**
 * ---------------------------
 * OBJDatabase class
 * ---------------------------
 */				

export default class OBJDatabase extends _Database {

    /**
     * Returns store names.
     * 
     * @return Array
     */
    list() {
        return Object.keys(this.database);
    }
	 
	/**
	 * Opens a store.
     * 
     * @param String  storeName
     * @param String  mode
     * @param Object params
     * 
     * @return OBJStore
	 */
	open(storeName, mode = 'readonly', params = {}) {
		var store = this.database[storeName];
		params.mode = mode;
		return new OBJStore(store, storeName, this.schema[storeName], params);
	}
	
    /**
     * Creates a store
     * 
     * @param String  storeName
     * @param Object schema
     * @param Bool  replace
     * 
     * @return OBJStore
     */
    async _create(storeName, schema, replace) {
        var store = [];
        this.database[storeName] = store;
        return new OBJStore(store, this.schema[storeName]);
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
};