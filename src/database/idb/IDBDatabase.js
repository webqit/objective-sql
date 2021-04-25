

/**
 * @imports
 */
import _isObject from '@webqit/util/js/isObject.js';
import _isFunction from '@webqit/util/js/isFunction.js';
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
     * @inheritdoc
     */
     async tables() {
        return _arrFrom(this.def.objectStoreNames);
     }

    /**
     * @inheritdoc
     */
    async table(tableName, params = {}) {
        var getStore = _mode => {
            var transaction = this.def.transaction([tableName], _mode || params.mode);
            // We can worry not about onerror, onabort, oncomplete
            return transaction.objectStore(tableName);
        };
		return new IDBStore(this, tableName, {
            schema: await this.getTableSchema(tableName),
            getStore,
        }, params);
    }

    /**
     * CREATE/ALTER/DROP
     */

    /**
     * @inheritdoc
     */
    async createTable(tableName, tableSchema, params = {}) {
        return this.driver.alterDatabase(this.name, database => {
            if (_arrFrom(database.objectStoreNames).includes(tableName)) {
                if (params.ifNotExists) {
                    return;
                }
                throw new Error(`Store name "${tableName}" already exists!`);
            }
            var storeParams = {};
            // ...with primary key
            var primaryKeyColumn = Object.keys(tableSchema.columns).filter(name => tableSchema.columns[name].primaryKey)[0];
            var autoIncrementColumn = Object.keys(tableSchema.columns).filter(name => tableSchema.columns[name].autoIncrement)[0];
            if (primaryKeyColumn) {
                storeParams.keyPath = primaryKeyColumn;
                if (primaryKeyColumn === autoIncrementColumn) {
                    storeParams.autoIncrement = true;
                }
            }
            var store = database.createObjectStore(tableName, storeParams);
            _each(this.diffSchema({}, tableSchema), (changeName, changeDef) => {
                if (changeName === 'primaryKey') {
                    return;
                }
                _each(changeDef.add, (prop, def) => {
                    this.applyToStore[changeName](store, prop, def);
                });
            });
            this.def.schema[tableName] = tableSchema;
            return new IDBStore(this, tableName, {
                schema: tableSchema,
                getStore: () => store,
            }, {});
        });
    }

    /**
     * @inheritdoc
     */
    async alterTable(tableName, newTableSchemaOrCallback, params = {}) {

        var tableSchema = await this.getTableSchema(tableName),
            newTableSchema;
        if (_isFunction(newTableSchemaOrCallback)) {
            // Modify existing schema
            newTableSchema = this.cloneSchema(tableSchema);
            await newTableSchemaOrCallback(newTableSchema);
        } else if (_isObject(callback)) {
            newTableSchema = newTableSchemaOrCallback;
        } else {
            throw new Error('Table/store modification expects only an object (new schema) or a function (callback that recieves existing schema).')
        }

        return this.driver.alterDatabase(this.name, database => {
            if (!_arrFrom(database.objectStoreNames).includes(tableName)) {
                if (params.ifExists) {
                    return;
                }
                throw new Error(`Store name "${tableName}" does not exist!`);
            }

            var transaction = database.transaction([tableName], 'readwrite');
            var store = transaction.objectStore(tableName);
            _each(this.diffSchema(tableSchema, newTableSchema), (changeName, changeDef) => {
                if (changeName !== 'renamedColumns') {
                    // "primaryKey", "columns", "foreignKeys", "indexes", "jsonColumns"
                    _each(changeDef.add, (prop, def) => {
                        this.applyToStore[changeName](store, prop, def, 'add');
                    });
                    _each(changeDef.alter, (prop, changes) => {
                        this.applyToStore[changeName](store, prop, changes.current, 'alter');
                    });
                    _each(changeDef.drop, (prop, oldDef) => {
                        this.applyToStore[changeName](store, prop, oldDef, 'drop');
                    });
                } else {
                    // "renamedColumns" actually comes last from source...
                    // and really should
                    _each(changeDef, (oldName, newName) => {
                        this.applyToStore[changeName](store, oldName, newName);
                    });
                }
            });
            this.def.schema[tableName] = newTableSchema;
            return new IDBStore(this, tableName, {
                schema: tableSchema,
                getStore: () => store,
            }, {});
    
        });
    }

    /**
     * Drops table.
     * 
     * @param String tableName
     * @param Object params
     * 
     * @return Bool
     */
    async dropTable(tableName, params = {}) {
        return this.driver.alterDatabase(this.name, database => {
            if (_arrFrom(database.objectStoreNames).includes(tableName)) {
                if (params.ifExists) {
                    return;
                }
                throw new Error(`Store name "${tableName}" does not exist!`);
            }
            delete this.def.schema[tableName];
            database.deleteObjectStore(tableName);
        });
    }

    /**
     * @inheritdoc
     */
    async getTableSchema(tableName) {
        return this.def.schema[tableName];
    }

    // -------

    applyToStore = {
        primaryKey: (store, columnName, def, delta) => {},
    
        columns: (store, columnName, def, delta) => {},
    
        foreignKeys: (store, columnName, def, delta) => {},
    
        indexes: (store, alias, def, delta) => {
            if (delta === 'drop') {
                store.deleteIndex(alias);
                return;
            }
            if (delta === 'alter' && store.indexNames.contains(alias)) {
                store.deleteIndex(alias);
            }
            store.createIndex(alias, def.keyPath, {unique: def.type === 'unique'});
        },
    
        jsonColumns: (store, alias, columnName, delta) => {},
    
        renamedColumns: (store, columnName, newColumnName) => {
            return 'ALTER COLUMN `' + columnName + '` RENAME TO `' + newColumnName + '`';
        },
    }

}