
/**
 * @imports
 */
import _objFrom from '@onephrase/util/obj/from.js';
import _arrFrom from '@onephrase/util/arr/from.js';
import _max from '@onephrase/util/arr/max.js';
import _each from '@onephrase/util/obj/each.js';
import _isString from '@onephrase/util/js/isString.js';
import Schema from './Schema.js';

export default class IDBSchema extends Schema {

    /**
     * ---------
     * APP
     * ---------
     */

    /**
     * Returns a list of database definitions.
     * 
     * @inheritdoc
     */
    static async _getDatabases() {
        if (typeof indexedDB === 'undefined') {
            throw new Error('IndexedDB is not available in the current environment.')
        }
        return _arrFrom(await indexedDB.databases());
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
    static _createDatabase(databaseName, tables, replace = false) {
        if (typeof indexedDB === 'undefined') {
            throw new Error('IndexedDB is not available in the current environment.')
        }
        return new Promise(async resolve => {
            var dbOpenRequest = indexedDB.open(databaseName);
            // Define tables?
            if ((tables || []).length) {
                dbOpenRequest.onupgradeneeded = e => {
                    databaseCreateTables(e.target.result, tables);
                };
            }
            // Catch success
            dbOpenRequest.onsuccess = e => resolve(e.target.result);
        });
    }

    /**
     * Drops a database.
     * 
     * @inheritdoc
     */
    static _dropDatabase(databaseName) {
        if (typeof indexedDB === 'undefined') {
            throw new Error('IndexedDB is not available in the current environment.')
        }
        return new Promise(resolve => {
            var dbDeleteRequest = indexedDB.deleteDatabase(databaseName);
            // Catch success
            dbDeleteRequest.onsuccess = e => resolve(true);
        });
    }

    /**
     * Returns table names.
     * 
     * @param String databaseName
     * 
     * @return void
     */
    static _getTables(databaseName) {
        return new Promise(resolve => {
            openDatabase(databaseName, e => resolve(_arrFrom(e.target.result.objectStoreNames)));
        });
    }

    /**
     * ---------
     * TABLES
     * ---------
     */

    /**
     * Deletes a table definition.
     * 
     * @inheritdoc
     */
    static _createTable(databaseName, tableName, tableDefinition, replace = false) {
        return new Promise(resolve => {
            // Define schema
            var store;
            const onupgradeneeded = e => {
                store = databaseCreateTables(e.target.result, [tableDefinition], replace)[0];
            };
            // Catch success
            const onsuccess = e => {
                if (!store) {
                    throw new Error('Store name "' + tableName + '" could not be created!');
                }
                resolve(store);
            };
            // Connect...
            openDatabase(databaseName, onsuccess, onupgradeneeded, true/* forceUpgrade */);
        });
    }

    /**
     * Deletes a table definition.
     * 
     * @inheritdoc
     */
    static _dropTable(databaseName, tableName) {
         return new Promise(resolve => {
            // Define schema
            var upgradeneeded;
            const onupgradeneeded = e => {
                upgradeneeded = true;
                var database = e.target.result;
                // Create store...
                if (!database.objectStoreNames.contains(tableName)) {
                    throw new Error('Store name "' + tableName + '" does not exist!');
                 }
                // TODO: allow to migrate data from old store
                database.deleteObjectStore(tableName);
            };
            // Catch success
            const onsuccess = e => {
                if (!upgradeneeded) {
                    throw new Error('Store name "' + tableName + '" could not be deleted!');
                }
                resolve(true);
            };
            // Connect...
            openDatabase(databaseName, onsuccess, onupgradeneeded, true/* forceUpgrade */);
        });
    }

    /**
     * ---------
     * STORAGE
     * ---------
     */

    /**
     * Populates a table.
     * 
     * @inheritdoc
     */
    static _seedTable(databaseName, tableName, entries, update = false) {
        return new Promise(resolve => {
            // Catch success
            const handle = (store, transaction) => {
                entries.forEach(entry => {
                    if (update) {
                        store.put(entry);
                    } else {
                        store.add(entry);
                    }
                });
                transaction.oncomplete = e => resolve(store);
            };
            // Connect...
            openObjectStore(databaseName, tableName, handle);
        });
    }

    /**
     * Empties a table.
     * 
     * @inheritdoc
     */
    static _emptyTable(databaseName, tableName) {
        return new Promise(resolve => {
            // Catch success
            const handle = (store, transaction) => {
                store.clear();
                transaction.oncomplete = e => resolve(store);
            };
            // Connect...
            openObjectStore(databaseName, tableName, handle);
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
 * @param String qualifiedDatabaseName 
 * @param Function onsuccess 
 * @param Function onupgradeneeded
 * @param Bool forceUpgrade
 * 
 * @return void
 */
export const openDatabase = (qualifiedDatabaseName, onsuccess, onupgradeneeded, forceUpgrade = false) => {
    var [ databaseName, databaseVersion ] = (qualifiedDatabaseName || 'default').split('@').concat(1);
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
 * Helps open an Object Store
 * 
 * @param String qualifiedTableName 
 * @param Function callback 
 * @param String mode
 * 
 * @return void
 */
export const openObjectStore = (qualifiedDatabaseName, tableName, callback, mode = 'readwrite') => {
    // Catch success
    const onsuccess = e => {
        var database = e.target.result;
        var transaction = database.transaction([tableName], mode);
        var store = transaction.objectStore(tableName);
        callback(store, transaction);
    };
    // Connect...
    openDatabase(qualifiedDatabaseName, onsuccess);
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
export const databaseCreateTables = (database, tables, replace) => {
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
            if (table.autoIncrement !== false) {
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