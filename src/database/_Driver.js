
/**
 * @imports
 */
import _isNumeric from '@webqit/util/js/isNumeric.js';
import _isObject from '@webqit/util/js/isObject.js';
import _isArray from '@webqit/util/js/isArray.js';
import _isEmpty from '@webqit/util/js/isEmpty.js';
import _isNull from '@webqit/util/js/isNull.js';
import _isUndefined from '@webqit/util/js/isUndefined.js';
import _each from '@webqit/util/obj/each.js';

/**
 * --------------------------
 * The Driver class.
 * --------------------------
 */
export default class Driver {
    
    constructor() {
        this.$ = {databases: {}};
        this.defaultDB = 'db1';
        this.defaultDBParams = {};
    }

    /**
     * Sets default database.
     * 
     * @param String databaseName
     * @param Object params
     * 
     * @return void
     */
    async setDefaultDB(databaseName, params = this.defaultDBParams) {
        this.defaultDB = databaseName;
        this.defaultDBParams = params;
    }

    /**
     * @forwardsTo: createDatabase().
     * @with: params.ifNotExixts = true
     */
    async createDatabaseIfNotExists(databaseName, params = this.defaultDBParams) {
        params = {...params};
        params.ifNotExists = true;
        return this.createDatabase(databaseName, params);
    }

    /**
     * @forwardsTo: dropDatabase().
     * @with: params.ifExixts = true
     */
    async dropDatabaseIfExists(databaseName, params = {}) {
        params = {...params};
        params.ifExists = true;
        return this.dropDatabase(databaseName, params);
    }

    /**
     * ---------
     * IMPORT/EXPORT
     * ---------
     */

    /**
     * Imports a database.
     * 
     * @param String databaseName
     * @param Object databaseDump
     * @param Object params
     * 
     * @return Array
     */
    async importDatabase(databaseName, databaseDump, params = {}) {
        if ((await this.databases(databaseName, params)).length) {
            if (params.ifNotExists) {
                return;
            }
            throw new Error(`Database ${databaseName} already exists.`);
        }
        if (!_isObject(databaseDump.schema) || (databaseDump.data && !_isObject(databaseDump.data))) {
            throw new Error(`Malformed import data.`);
        }
        var database = await this.createDatabase(databaseName, params);
        return Promise.all(Object.keys(databaseDump.schema).map(async tableName => {
            var tableSchema = databaseDump.schema[tableName];
            var tableData = (databaseDump.data || {})[tableName];
            if (_isNumeric(tableName)) {
                tableName = tableSchema.name;
            }
            if (!tableName || !_isObject(tableSchema) || (tableData && !_isArray(tableData))) {
                throw new Error(`Malformed import data for table ${tableName}.`);
            }
            var table = await database.createTable(tableName, tableSchema);
            return table.addAll(tableData || []);
        }));
    }

    /**
     * Exports a database.
     * 
     * @param String databaseName
     * @param Object params
     * 
     * @return Array
     */
    async exportDatabase(databaseName, params) {
        if (!(await this.databases(databaseName, params)).length) {
            if (params.ifExists) {
                return;
            }
            throw new Error(`Database ${databaseName} does not exist.`);
        }
        var database = await this.database(databaseName, params);
        // -------------------
        var databaseDump = {schema: {}, data: {}};
        // -------------------
        var tableNames = await database.tables();
        await Promise.all(tableNames.map(async tableName => {
            var table = await database.table(tableName);
            databaseDump.schema[tableName] = await table.getSchema();
            databaseDump.data[tableName] = await table.getAll();
        }));
        return databaseDump;
    }

    /**
     * Returns the database schema.
     * 
     * @param String databaseName 
     * 
     * @returns Object
     */
    getDatabaseSchema(databaseName = this.defaultDB) {
        return (this.$.databases[databaseName] || {}).schema;
    }

    /**
     * Sets the database schema.
     * 
     * @param String databaseName 
     * @param Object databaseSchema 
     * 
     * @returns this
     */
    setDatabaseSchema(databaseName, databaseSchema) {
        if (!this.$.databases[databaseName]) {
            this.$.databases[databaseName] = {};
        }
        this.$.databases[databaseName].schema = databaseSchema;
        return this;
    }

    /**
     * ---------------------------------------
     */

    /**
     * 
     * @param Array databaseList 
     * @param String databasename 
     * @param Object params 
     * 
     * @returns Array
     */
    matchDatabaseList(databaseList, databasename = null, params = []) {
        return databaseList.filter(db => (
            _isUndefined(databasename) || _isNull(databasename) || db.name === databasename
        ) && (
            _isEmpty(params) || !('version' in params) || !('version' in db) || db.version === params.version
        ));
    }
}