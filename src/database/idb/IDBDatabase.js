

/**
 * @imports
 */
import _max from '@webqit/util/arr/max.js';
import _arrFrom from '@webqit/util/arr/from.js';
import _each from '@webqit/util/obj/each.js';
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
    async list() {
        return _arrFrom(this.database.objectStoreNames);
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
     * @param String  onExists
     * 
     * @return IDBStore
     */
    _create(storeName, schema, onExists = null) {
        return new Promise(resolve => {
            // Define schema
            var store;
            const onupgradeneeded = e => {
                store = databaseCreateSchema(e.target.result, [schema], onExists)[0];
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
 * @param Array schema 
 * @param String onExists
 * 
 * @return void
 */
export const databaseCreateSchema = (database, schema, onExists) => {
    return schema.map(storeSchema => {
        if (!storeSchema.driver) {
            storeSchema.driver = 'IDB';
        }
        // Create store...
        var storeExistence;
        if (database.objectStoreNames.contains(storeSchema.name)) {
            if (!onExists) {
                throw new Error('Store name "' + storeSchema.name + '" already exists!');
            }
            if (onExists === 'drop') {
                // TODO: allow to migrate data from old store
                database.deleteObjectStore(storeSchema.name);
            } else {
                storeExistence = true;
            }
        }
        var storeParams = {};
        // ...with primary key
        if (storeSchema.primaryKey) {
            storeParams.keyPath = storeSchema.primaryKey;
            if (storeSchema.autoIncrement) {
                storeParams.autoIncrement = true;
            }
        }
        var store;
        if (storeExistence) {
            var transaction = database.transaction([storeSchema.name], 'readwrite');
            store = transaction.objectStore(storeSchema.name);
        } else {
            store = database.createObjectStore(storeSchema.name, storeParams);
        }
        // Create Unique keys
        if (storeSchema.uniqueKeys) {
            _each(storeSchema.uniqueKeys, (indexName, keyPaths) => {
                if (store.indexNames.contains(indexName)) {
                    store.deleteIndex(indexName);
                }
                store.createIndex(indexName, keyPaths, {unique: true});
            });
        }
        return store;
    });
};