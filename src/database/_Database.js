

/**
 * @imports
 */
import _isObject from '@webqit/util/js/isObject.js';
import _arrFrom from '@webqit/util/arr/from.js';
import _each from '@webqit/util/obj/each.js';
import _intersect from '@webqit/util/arr/intersect.js';
import _difference from '@webqit/util/arr/difference.js';

/**
 * ---------------------------
 * _Database class
 * ---------------------------
 */				

export default class _Database {
	
	/**
	 * @constructor
	 */
	constructor(driver, databaseName, def) {
		this.driver = driver;
		this.databaseName = databaseName;
		this.def = def;
	}
	
    /**
     * @inheritdoc
     */
     async tables() {}

    /**
     * Drops a database.
     * 
     * @param String            tableName
     * 
     * @return Bool
     */
    async table(tableName) {}

    /**
     * CREATE/ALTER/DROP
     */

    /**
     * Creates table.
     * 
     * @param String            tableName
     * @param Object            tableSchema
     * @param Object            params
     * 
     * @return Object
     */
    async createTable(tableName, tableSchema = {}, params = {}) {}

    /**
     * Alters table.
     * 
     * @param String            tableName
     * @param Object|Function   newTableSchemaOrCallback
     * @param Object            params
     * 
     * @return Bool
     */
    async alterTable(tableName, newTableSchemaOrCallback, params = {}) {}

    /**
     * Drops table.
     * 
     * @param String            tableName
     * @param Object            params
     * 
     * @return Bool
     */
    async dropTable(tableName, params = {}) {}

    /**
     * ---------
     * SCHEMA
     * ---------
     */

    /**
     * Deep-clones the given inout.
     * 
     * @param String            tableName
     * 
     * @return Object
     */
    async getSchema(tableName) {}

    /**
     * Deep-clones the given inout.
     * 
     * @param Any               schema
     * 
     * @return Any
     */
     cloneSchema(schema) {
        if (_isObject(schema)) {
            var newSchema = {};
            _each(schema, (name, value) => {
                newSchema[name] = this.cloneSchema(value);
            });
            return newSchema;
        }
        if (_isArray(schema)) {
            return schema.map(value => this.cloneSchema(value));
        }
        return schema;
    }

    /**
     * Deep-diffs the given schema into action items.
     * 
     * @param Object            prevSchema
     * @param Object            newSchema
     * 
     * @return Object
     */
    diffSchema(prevSchema, newSchema) {

        const schemaChanges = {
            columns: {add: {}, alter: {}, drop: {}},
            primaryKey: {add: {}, alter: {}, drop: {}},
            foreignKeys: {add: {}, alter: {}, drop: {}},
            indexes: {add: {}, alter: {}, drop: {}},
            jsonColumns: {add: {}, alter: {}, drop: {}},
            renamedColumns: {},
        };
    
        const schemaChangeRecorders = {

            // Name
            name: () => {
            },
    
            // Columns
            columns: (action, newColumnsDef, prevColumnsDef) => {
                
                // -------
                // Identify added/altered/dropped keys
                // -------
                var currentColumns = Object.keys(action === 'drop' ? {} : newColumnsDef),
                    prevColumns = Object.keys(action === 'add' ? {} : prevColumnsDef);
    
                _difference(currentColumns, prevColumns).forEach(columnName => {
                    schemaChanges.columns.add[columnName] = newColumnsDef[columnName];
                    // -------
                    if (newColumnsDef[columnName].primaryKey) {
                        schemaChanges.primaryKey.add = columnName;
                    }
                    if (newColumnsDef[columnName].referencedEntity) {
                        schemaChanges.foreignKeys.add[columnName] = newColumnsDef[columnName].referencedEntity;
                    }
                    if (newColumnsDef[columnName].index) {
                        schemaChanges.indexes.add[columnName] = {keys: columnName, type: 'index'};
                    }
                    if (newColumnsDef[columnName].unique) {
                        schemaChanges.indexes.add[columnName] = {keyPath: columnName, type: 'unique'};
                    }
                    if (newColumnsDef[columnName].fulltext) {
                        schemaChanges.indexes.add[columnName] = {keyPath: columnName, type: 'fulltext'};
                    }
                    // -------
                    if ((newColumnsDef[columnName].type || '').toLowerCase() === 'json') {
                        schemaChanges.jsonColumns.add[columnName] = true;
                    }
                });
                _intersect(currentColumns, prevColumns).forEach(columnName => {
                    // -------
                    // Identify added/altered/dropped properties
                    // -------
                    var currentColumnProps = Object.keys(newColumnsDef[columnName]),
                        prevColumnProps = Object.keys(prevColumnsDef[columnName]);
    
                    var changes = schemaChanges.columns.alter[columnName] = {
                        current: newColumnsDef[columnName], 
                        prev: prevColumnsDef[columnName],
                        addedProps: _difference(currentColumnProps, prevColumnProps),
                        alteredProps: _intersect(currentColumnProps, prevColumnProps),
                        droppedProps: _difference(prevColumnProps, currentColumnProps),
                    };
    
                    // -------
                    if (changes.addedProps.includes('primaryKey') || (changes.alteredProps.includes('primaryKey') && newColumnsDef[columnName].primaryKey)) {
                        schemaChanges.primaryKey.add = columnName;
                    } else if (changes.droppedProps.includes('primaryKey') || (changes.alteredProps.includes('primaryKey') && !newColumnsDef[columnName].primaryKey)) {
                        schemaChanges.primaryKey.drop = columnName;
                    }
                    if (changes.addedProps.includes('referencedEntity') || (changes.alteredProps.includes('referencedEntity') && newColumnsDef[columnName].referencedEntity)) {
                        schemaChanges.foreignKeys.add[columnName] = newColumnsDef[columnName].referencedEntity;
                    } else if (changes.droppedProps.includes('referencedEntity') || (changes.alteredProps.includes('referencedEntity') && !newColumnsDef[columnName].referencedEntity)) {
                        schemaChanges.foreignKeys.drop[columnName] = prevColumnsDef[columnName].referencedEntity;
                    }
                    if (changes.addedProps.includes('index') || (changes.alteredProps.includes('index') && newColumnsDef[columnName].index)) {
                        schemaChanges.indexes.add[columnName] = {keys: columnName, type: 'index'};
                    } else if (changes.droppedProps.includes('index') || (changes.alteredProps.includes('index') && !newColumnsDef[columnName].index)) {
                        schemaChanges.indexes.drop[columnName] = {keys: columnName, type: 'index'};
                    }
                    if (changes.addedProps.includes('unique') || (changes.alteredProps.includes('unique') && newColumnsDef[columnName].unique)) {
                        schemaChanges.indexes.add[columnName] = {keyPath: columnName, type: 'unique'};
                    } else if (changes.droppedProps.includes('unique') || (changes.alteredProps.includes('unique') && !newColumnsDef[columnName].unique)) {
                        schemaChanges.indexes.drop[columnName] = {keyPath: columnName, type: 'unique'};
                    }
                    if (changes.addedProps.includes('fulltext') || (changes.alteredProps.includes('fulltext') && newColumnsDef[columnName].fulltext)) {
                        schemaChanges.indexes.add[columnName] = {keyPath: columnName, type: 'fulltext'};
                    } else if (changes.droppedProps.includes('fulltext') || (changes.alteredProps.includes('fulltext') && !newColumnsDef[columnName].fulltext)) {
                        schemaChanges.indexes.drop[columnName] = {keyPath: columnName, type: 'fulltext'};
                    }
                    // -------
                    if ((changes.addedProps.includes('type') || changes.alteredProps.includes('type')) && (newColumnsDef[columnName].type || '').toLowerCase() === 'json') {
                        schemaChanges.jsonColumns.add[columnName] = columnName;
                    } else if ((changes.droppedProps.includes('type') || changes.alteredProps.includes('type')) && (prevColumnsDef[columnName].type || '').toLowerCase() === 'json') {
                        schemaChanges.jsonColumns.drop[columnName] = columnName;
                    }
                
                });
                _difference(prevColumns, currentColumns).forEach(columnName => {
                    schemaChanges.columns.drop[columnName] = prevColumnsDef[columnName];
                    // -------
                    if (prevColumnsDef[columnName].primaryKey) {
                        schemaChanges.primaryKey.drop = columnName;
                    }
                    if (prevColumnsDef[columnName].referencedEntity) {
                        schemaChanges.foreignKeys.drop[columnName] = prevColumnsDef[columnName].referencedEntity;
                    }
                    if (prevColumnsDef[columnName].index) {
                        schemaChanges.indexes.drop[columnName] = {keys: columnName, type: 'index'};
                    }
                    if (prevColumnsDef[columnName].unique) {
                        schemaChanges.indexes.drop[columnName] = {keyPath: columnName, type: 'unique'};
                    }
                    if (prevColumnsDef[columnName].fulltext) {
                        schemaChanges.indexes.drop[columnName] = {keyPath: columnName, type: 'fulltext'};
                    }
                    // -------
                    if ((prevColumnsDef[columnName].type || '').toLowerCase() === 'json') {
                        schemaChanges.jsonColumns.drop[columnName] = true;
                    }
                });
            },
    
            // Primary Key
            primaryKey: (action, newPrimaryKeyDef, prevPrimaryKeyDef) => {
                var keyName = _arrFrom(newPrimaryKeyDef).join('___');
                var prevKeyName = _arrFrom(prevPrimaryKeyDef).join('___');
                if (keyName !== prevKeyName) {
                    schemaChanges.primaryKey[action] = action === 'drop' ? prevPrimaryKeyDef : newPrimaryKeyDef;
                }
            },
    
            // Unique Keys
            foreignKeys: (action, newKeysDef, prevKeysDef) => {
                
                // -------
                // Identify added/altered/dropped keys
                // -------
                var currentKeys = Object.keys(action === 'drop' ? {} : newKeysDef),
                    prevKeys = Object.keys(action === 'add' ? {} : prevKeysDef);
    
                _difference(currentKeys, prevKeys).forEach(keyName => {
                    schemaChanges.foreignKeys.add[keyName] = newKeysDef[keyName];
                });
                _intersect(currentKeys, prevKeys).forEach(keyName => {
                    schemaChanges.foreignKeys.alter[keyName] = {
                        current: newKeysDef[keyName],
                        prev: prevKeysDef[keyName],
                    };
                });
                _difference(prevKeys, currentKeys).forEach(keyName => {
                    schemaChanges.foreignKeys.drop[keyName] = prevKeysDef[keyName];
                });
    
            },
    
            // Unique Keys
            indexes: (action, newIndexesDef, prevIndexesDef) => {
                
                // -------
                // Identify added/altered/dropped keys
                // -------
                var currentKeys = Object.keys(action === 'drop' ? {} : newIndexesDef),
                    prevKeys = Object.keys(action === 'add' ? {} : prevIndexesDef);
    
                _difference(currentKeys, prevKeys).forEach(keyName => {
                    schemaChanges.indexes.add[keyName] = newIndexesDef[keyName];
                });
                _intersect(currentKeys, prevKeys).forEach(keyName => {
                    schemaChanges.indexes.alter[keyName] = {
                        current: newIndexesDef[keyName], 
                        prev: prevIndexesDef[keyName],
                    };
                });
                _difference(prevKeys, currentKeys).forEach(keyName => {
                    schemaChanges.indexes.drop[keyName] = prevIndexesDef[keyName];
                });
    
            },
    
        };
    
        // ------------------
        var currentProps = Object.keys(newSchema),
            prevProps = Object.keys(prevSchema);
        _difference(currentProps, prevProps).forEach(prop => {
            // Add all these props
            schemaChangeRecorders[prop]('add', newSchema[prop], null);
        });
        _intersect(currentProps, prevProps).forEach(prop => {
            // Alter all these props
            schemaChangeRecorders[prop]('alter', newSchema[prop], prevSchema[prop]);
        });
        _difference(prevProps, currentProps).forEach(prop => {
            // Drop all these props
            schemaChangeRecorders[prop]('drop', null, prevSchema[prop]);
        });
        // ------------------
    
        return schemaChanges;
    }

    /**
     * Deep-validates the given schema.
     * 
     * @param Object schema
     * @param Bool assert
     * 
     * @return Bool
     */
     validateSchema(schema, assert = false) {
        try {
            if (!_isObject(schema)) {
                throw new Error('Table definition must be an object.');
            }
            if (!schema.name) {
                throw new Error('Table must have a name.');
            }
            if (!_isObject(schema.columns)) {
                throw new Error('Table must have a valid "columns" list.');
            }
            _each(schema.columns, (columnName, column) => {
                if (!_isObject(column)) {
                    throw new Error('Invalid column definition: "' + columnName + '" at "' + schema.name + '".');
                }
                if (column.referencedEntity
                    && !(_isObject(column.referencedEntity) && column.referencedEntity.name)) {
                    throw new Error('Invalid foreign key definition: "' + columnName + '" at "' + schema.name + '".');
                }
            });
        } catch(e) {
            if (assert) throw e;
            return false;
        }
        return true;
    }

}