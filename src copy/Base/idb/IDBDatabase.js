

/**
 * @imports
 */
import _max from '@onephrase/util/arr/max.js';
import _each from '@onephrase/util/obj/each.js';
import _Database from '../_Database.js';
import IDBStore from './IDBStore.js';

/**
 * ---------------------------
 * IDBDatabase class
 * ---------------------------
 */				

export default class IDBDatabase extends _Database {
	
    /**
     * Returns store names.
     * 
     * @return void
     */
    list() {
        return this.database.objectStoreNames;
    }
	 
	/**
	 * Opens a store.
     * 
     * @param String  storeName
     * @param String  mode
     * @param Object params
     * 
     * @return IDBStore
	 */
	open(storeName, mode = 'readonly', params = {}) {
        var getter = _mode => {
            var transaction = this.database.transaction([storeName], _mode || mode);
            // We can worry not about onerror, onabort, oncomplete
            return transaction.objectStore(storeName);
        };
        params.mode = mode;
		return new IDBStore(getter, storeName, this.schema[storeName], params);
	}

    /**
     * Creates a store
     * 
     * @param String  storeName
     * @param Object schema
     * @param Bool  replace
     * 
     * @return IDBStore
     */
    _create(storeName, schema, replace = false) {
        return new Promise(resolve => {
            // Define schema
            var store;
            const onupgradeneeded = e => {
                store = databaseCreateStores(e.target.result, [schema], replace)[0];
            };
            // Catch success
            const onsuccess = e => {
                if (!store) {
                    throw new Error('Store name "' + storeName + '" could not be created!');
                }
                resolve(this.open(storeName, 'readwrite'));
            };
            // Connect...
            openDatabase(this.name, this.version, onsuccess, onupgradeneeded, true/* forceUpgrade */);
        });
    }

    /**
     * Drops a store.
     * 
     * @param String  storeName
     * 
     * @return Bool
     */
    _drop(storeName) {
         return new Promise(resolve => {
            // Define schema
            var upgradeneeded;
            const onupgradeneeded = e => {
                upgradeneeded = true;
                var database = e.target.result;
                // Create store...
                if (!database.objectStoreNames.contains(storeName)) {
                    throw new Error('Store name "' + storeName + '" does not exist!');
                 }
                // TODO: allow to migrate data from old store
                database.deleteObjectStore(storeName);
            };
            // Catch success
            const onsuccess = e => {
                if (!upgradeneeded) {
                    throw new Error('Store name "' + storeName + '" could not be deleted!');
                }
                resolve(true);
            };
            // Connect...
            openDatabase(this.name, this.version, onsuccess, onupgradeneeded, true/* forceUpgrade */);
        });
    }
};

/**
 * ---------
 * HELPERS
 * ---------
 */

/**
 * Helps open a database.
 * 
 * @param String databaseName 
 * @param String databaseVersion 
 * @param Function onsuccess 
 * @param Function onupgradeneeded
 * @param Bool forceUpgrade
 * 
 * @return void
 */
export const openDatabase = (databaseName, databaseVersion, onsuccess, onupgradeneeded, forceUpgrade = false) => {
    if (typeof indexedDB === 'undefined') {
        throw new Error('IndexedDB is not available in the current environment.')
    }
    (async () => {
        if (forceUpgrade) {
            var exisitingVersions = (await IDBSchema._getDatabases()).filter(d => d.name === databaseName).map(d => d.version);
            if (exisitingVersions.length) {
                var maxExistingVersion = parseInt(_max(exisitingVersions));
                if (databaseVersion <= maxExistingVersion) {
                    databaseVersion = maxExistingVersion + 1;
                }
            }
        }
        var dbOpenRequest = indexedDB.open(databaseName, databaseVersion);
        // Catch success
        dbOpenRequest.onsuccess = onsuccess;
        dbOpenRequest.onupgradeneeded = onupgradeneeded;
    })();
};

/**
 * Helps create Object Stores
 * 
 * @param IDBDatabase database 
 * @param Array tables 
 * @param Bool replace
 * 
 * @return void
 */
export const databaseCreateStores = (database, tables, replace) => {
    return tables.map(table => {
        // Create store...
        if (database.objectStoreNames.contains(table.name)) {
            if (!replace) {
                throw new Error('Store name "' + table.name + '" already exists!');
            }
            // TODO: allow to migrate data from old store
            database.deleteObjectStore(table.name);
        }
        var storeParams = {};
        // ...with primary key
        if (table.primaryKey) {
            storeParams.keyPath = table.primaryKey;
            if (table.autoIncrement) {
                storeParams.autoIncrement = true;
            }
        }
        var store = database.createObjectStore(table.name, storeParams);
        // Create Unique keys
        if (table.uniqueKeys) {
            _each(table.uniqueKeys, (indexName, keyPaths) => {
                if (store.indexNames.contains(indexName)) {
                    store.deleteIndex(indexName);
                }
                store.createIndex(indexName, keyPaths, {unique: true});
            });
        }
        if (!table.engine) {
            table.engine = 'IDB';
        }
        return store;
    });
};