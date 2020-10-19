
/**
 * @imports
 */
import _isObject from '@onephrase/util/js/isObject.js';
import _arrFrom from '@onephrase/util/arr/from.js';
import _each from '@onephrase/util/obj/each.js';

/**
 * --------------------------
 * Programmatic API for database management.
 * --------------------------
 * .getDatabases()
 * .createDatabase()
 * .hasDatabase()
 * .dropDatabase()
 * .getTables()
 * .createTable()
 * .hasTable()
 * .dropTable()
 * .seedTable()
 * .emptyTable()
 */
export default class Schema {

    /**
     * ---------
     * APP
     * ---------
     */

    /**
     * Returns a list of database definitions.
     * 
     * @return Array
     */
    static async getDatabases() {
        if (this._getDatabases) {
            return await this._getDatabases();
        }
        return Object.keys(this.databases).map(d => { return {name: d, version: 0}; });
    }

    /**
     * ---------
     * DATABASE
     * ---------
     */

    /**
     * Drops a database.
     * 
     * @param String databaseName
     * @param Array  tables
     * @param Bool  replace
     * 
     * @return Bool
     */
    static async createDatabase(databaseName = 'default', tables = [], replace = false) {
        var currentDatabases = await this.getDatabases();
        var existingVersions = _arrFrom(currentDatabases).filter(d => d.name === databaseName).map(d => d.version);
        if (existingVersions.length) {
            if (!replace) {
                throw new Error('Database "' + databaseName + '" already exists at versions: ' + existingVersions.join(',') + '!');
            }
            await this.dropDatabase(databaseName);
        }
        var _return;
        if (this._createDatabase) {
            _return = await this._createDatabase(databaseName, tables, replace);
        this.databases[databaseName] = {};
        } else {
            this.databases[databaseName] = {};
        }
        // ------------------
        this.schemas[databaseName] = {};
        if ((tables || []).length) {
            databaseCreateTables(this.schemas[databaseName], tables || []);
            tables.forEach(table => {
                this.databases[databaseName][table.name] = [];
            });
        }
        // ------------------
        if (!_return) {
            _return = {
                name: databaseName,
                schema: this.schemas[databaseName],
                content: this.databases[databaseName],
            };
        }
        return _return;
    }

    /**
     * Has a database?
     * 
     * @param String databaseName
     * 
     * @return Bool
     */
    static async hasDatabase(databaseName = 'default') {
        var databases = await this.getDatabases();
        return databases.filter(database => database.name === databaseName).length > 0;
    }

    /**
     * Drops a database.
     * 
     * @param String databaseName
     * 
     * @return Bool
     */
    static dropDatabase(databaseName = 'default') {
        return new Promise(async resolve => {
            if (!(await this.hasDatabase(databaseName))) {
                throw new Error('Database "' + databaseName + '" has not been defined.');
            }
            var _return;
            if (this._dropDatabase) {
                _return = await this._dropDatabase(databaseName);
            } else {
                delete this.databases[databaseName];
                _return = true;
            }
            // ------------------
            delete this.schemas[databaseName];
            // ------------------
            resolve(_return);
        });
    }

    /**
     * Returns table names.
     * 
     * @param String qualifiedDatabaseName
     * 
     * @return Array
     */
    static getTables(qualifiedDatabaseName = 'default') {
        return new Promise(resolve => {
            openDatabase(qualifiedDatabaseName, (schema, database, databaseName) => {
                var _return;
                if (this._getTables) {
                    _return = this._getTables(databaseName);
                } else {
                    _return = Object.keys(schema);
                }
                resolve(_return);
            }, false);
        });
    }

    /**
     * ---------
     * TABLES
     * ---------
     */

    /**
     * Adds a table definition.
     * 
     * @param String qualifiedTableName
     * @param Object tableDefinition
     * 
     * @return Bool
     */
    static createTable(qualifiedTableName, tableDefinition, replace = false) {
        var [ tableName, databaseName ] = qualifiedTableName.split('@');
        return new Promise(resolve => {
            openDatabase(databaseName, async (schema, database, databaseName) => {
                if (await this.hasTable(qualifiedTableName)) {
                    if (!replace) {
                        throw new Error('Table "' + tableName + '" already exists.');
                    }
                    await this.dropTable(qualifiedTableName);
                }
                // ------------------
                var _return;
                if (this._createTable) {
                    _return = await this._createTable(databaseName, tableName, tableDefinition, replace);
                } else {
                    database[tableName] = [];
                }
                // ------------------
                databaseCreateTables(schema, [tableDefinition], replace);
                // ------------------
                if (!_return) {
                    _return = {
                        name: tableName,
                        schema: schema[tableName],
                        content: database[tableName],
                    };
                }
                resolve(_return);
            });
        });
    }

    /**
     * Has a table?
     * 
     * @param String qualifiedTableName
     * 
     * @return Bool
     */
    static async hasTable(qualifiedTableName) {
        var [ tableName, databaseName ] = qualifiedTableName.split('@');
        var tables = await this.getTables(databaseName);
        return tables.includes(tableName);
    }

    /**
     * Deletes a table definition.
     * 
     * @param String qualifiedTableName
     * 
     * @return Bool
     */
    static dropTable(qualifiedTableName) {
        var [ tableName, databaseName ] = qualifiedTableName.split('@');
        return new Promise(resolve => {
            openDatabase(databaseName, async (schema, database, databaseName) => {
                if (!(await this.hasTable(qualifiedTableName))) {
                    throw new Error('Table "' + tableName + '" has not been defined.');
                }
                var _return;
                if (this._dropTable) {
                    _return = await this._dropTable(databaseName, tableName);
                } else {
                    delete database[tableName];
                    _return = true;
                }
                // ------------------
                delete schema[tableName];
                // ------------------
                resolve(_return);
            });
        });
    }

    /**
     * ---------
     * STORAGE
     * ---------
     */

    /**
     * Empties a table.
     * 
     * @param String qualifiedTableName
     * @param Array entries
     * @param Bool update
     * 
     * @return Bool
     */
    static seedTable(qualifiedTableName, entries, update = false) {
        return new Promise(resolve => {
            openObjectStore(qualifiedTableName, (schema, table, tableName, databaseName) => {
                var _return;
                if (this._seedTable) {
                    _return = this._seedTable(databaseName, tableName, entries, update);
                } else {
                    table.push(...entries);
                    _return = table;
                }
                resolve(_return);
            });
        });
    }

    /**
     * Empties a table.
     * 
     * @param String qualifiedTableName
     * 
     * @return Bool
     */
    static emptyTable(qualifiedTableName) {
        return new Promise(resolve => {
            openObjectStore(qualifiedTableName, (schema, table, tableName, databaseName) => {
                var _return;
                if (this._emptyTable) {
                    _return = this._emptyTable(databaseName, tableName);
                } else {
                    table.splice(0);
                    _return = table;
                }
                resolve(_return);
            });
        });
    }
};

/**
 * ---------
 * DEFINITIONS
 * ---------
 */

/**
 * Databases definitions.
 * 
 * @var Object
 */
Schema.schemas = {};

/**
 * Databases storage.
 * 
 * @var Object
 */
Schema.databases = {};

/**
 * ---------
 * HELPERS
 * ---------
 */

/**
 * Helps open a database.
 * 
 * @param String qualifiedDatabaseName 
 * @param Function callback 
 * @param Bool createIfNotExists 
 * 
 * @return void
 */
const openDatabase = (qualifiedDatabaseName, callback, createIfNotExists = true) => {
    var databaseName = qualifiedDatabaseName || 'default';
    if (!Schema.schemas[databaseName]) {
        if (!createIfNotExists) {
            throw new Error('Database "' + databaseName + '" has not been defined.');
        }
        Schema.schemas[databaseName] = {};
        Schema.databases[databaseName] = {};
    }
    callback(Schema.schemas[databaseName], Schema.databases[databaseName], databaseName);
};

/**
 * Helps open an Object Store
 * 
 * @param String qualifiedTableName 
 * @param Function callback 
 * 
 * @return void
 */
const openObjectStore = (qualifiedTableName, callback) => {
    var [ tableName, databaseName ] = qualifiedTableName.split('@');
    openDatabase(databaseName, (schema, database, databaseName) => {
        if (!database[tableName]) {
            throw new Error('Table "' + tableName + '" has not been defined.');
        }
        callback(schema[tableName], database[tableName], tableName, databaseName);
    });
};

/**
 * Helps validate a Table schema definition.
 * 
 * @param Object table 
 * 
 * @return void
 */
const validateTableSchema = (table) => {
    if (!_isObject(table)) {
        throw new Error('Table definition must be an object.');
    }
    if (!table.name) {
        throw new Error('Table must have a name.');
    }
    if (!_isObject(table.fields)) {
        throw new Error('Table must have a valid "fields" list.');
    }
    _each(table.fields, (fieldName, field) => {
        if (!_isObject(field)) {
            throw new Error('Invalid field definition: "' + fieldName + '" at "' + table.name + '".');
        }
        if (field.referencedEntity
            && !(_isObject(field.referencedEntity) && field.referencedEntity.name)) {
            throw new Error('Invalid foreign key definition: "' + fieldName + '" at "' + table.name + '".');
        }
    });
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
const databaseCreateTables = (schema, tables, replace) => {
    return tables.map(table => {
        validateTableSchema(table);
        if (schema[table.name]) {
            if (!replace) {
                throw new Error('Store name "' + table.name + '" already exists!');
            }
        }
        schema[table.name] = table;
    });
};