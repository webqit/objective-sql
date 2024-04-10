
/**
 * @imports
 */
import { _isNumeric, _isObject, _isArray, _isEmpty, _isNull, _isUndefined } from '@webqit/util/js/index.js';
import { _each } from '@webqit/util/obj/index.js';
import CreateDatabase from '../statement/schema/CreateDatabase.js';
import AlterDatabase from '../statement/schema/AlterDatabase.js';
import DropDatabase from '../statement/schema/DropDatabase.js';
import AlterTable from '../statement/schema/AlterTable.js';
import CreateTable from '../statement/schema/CreateTable.js';

/**
 * --------------------------
 * The Client class.
 * --------------------------
 */
const objInternals = {
    infoSchemaDB: 'obj_information_schema',
    instances: new Set,
    schemas: new Map,
};
export default class _Client {
    
    constructor(driver, params = {}) {
        if (!this.constructor.kind) throw new Error(`Subclasses of Objective SQL Client must implement a static "kind" property.`);
        if (!objInternals.schemas.has(this.constructor.kind)) { objInternals.schemas.set(this.constructor.kind, new Map); }
        objInternals.instances.add(this);
        Object.defineProperty(this, '$', { value: {
            driver,
            schemas: objInternals.schemas.get(this.constructor.kind),
            params, 
        }});
    }

    /**
     * @property String
     */
    static get OBJ_INFOSCHEMA_DB() { return objInternals.infoSchemaDB; }

    /**
     * @property Driver
     */
    get driver() { return this.$.driver; }

    /**
     * @property Object
     */
    get params() { return this.$.params; }

    /**
     * Sets or returns default database.
     * 
     * @param Array            args
     * 
     * @return String
     */
    async defaultDatabase(...args) { return this.defaultDatabaseCallback(() => {}, ...arguments); }

    /**
     * Returns list of databases.
     * 
     * @param Object            params
     * 
     * @return Array
     */
    async databases(params = {}) { return this.databasesCallback(() => ([]), ...arguments); }

    /**
     * Creates a database.
     * 
     * @param String            dbName
     * @param Object            params
     * 
     * @return Bool
     */
    async createDatabase(dbName, params = {}) { return this.createDatabaseCallback(...arguments); }

    /**
     * Forwards to: createDatabase().
     * @with: params.ifNotExixts = true
     */
    async createDatabaseIfNotExists(dbName, params = {}) { return this.createDatabase(dbName,  { ...params, ifNotExists: true }); }

    /**
     * Returns a database instance.
     * 
     * @param String            dbName
     * @param Function          editCallback
     * @param Object            params
     * 
     * @return Bool
     */
    async alterDatabase(dbName, editCallback, params = {}) { return this.alterDatabaseCallback(...arguments); }

    /**
     * Drops a database.
     * 
     * @param String            dbName
     * @param Object            params
     * 
     * @return Bool
     */
    async dropDatabase(dbName, params = {}) { return this.dropDatabaseCallback(...arguments); }

    /**
     * @forwardsTo: dropDatabase().
     * @with: params.ifExixts = true
     */
    async dropDatabaseIfExists(dbName, params = {}) { return this.dropDatabase(dbName, { ...params, ifNotExists: true }); }

    /**
     * Returns a database instance.
     * 
     * @param String            dbName
     * @param Object            params
     * 
     * @return Database
     */
    database(dbName, params = {}) {
        if (!this.$.schemas.has(dbName)) {
            this.$.schemas.set(dbName, {
                name: dbName,
                tables: new Map,
                inmem: true,
            });
        }
        return new this.constructor.Database(this, ...arguments);
    }

    /**
     * BASE LOGICS
     */

    /**
     * Base logic for the defaultDatabase() method.
     * 
     * @param Function callback
     * @param Array args
     * 
     * @return String
     */
    async defaultDatabaseCallback(callback, ...args) {
        let dbName, params = {};
        if (args.length === 2 || (args.length === 1 && _isObject(args[0]))) { params = args.pop(); }
        if (dbName = args.pop()) {
            this.$.defaultDB = dbName;
            return await callback(dbName);
        }
        if (!this.$.defaultDB || params.force) {
            const defaultDB = await callback() || (await this.databases())[0];
            this.$.defaultDB = defaultDB;
        }
        return this.$.defaultDB;
    }

    /**
     * Base logic for the databases() method.
     * 
     * @param Function callback
     * @param Object filter
     * @param Array standardExclusions
     * 
     * @return Array
     */
    async databasesCallback(callback, filter = {}, standardExclusions = []) {
        if (!this.$.schemas._touched || filter.force) {
            this.$.schemas._touched = true;
            for (let db of await callback()) {
                if (typeof db === 'string') { db = { name: db }; }
                if (this.$.schemas.has(db.name)) {
                    delete this.$.schemas.has(db.name).inmem;
                    if (db.version) { this.$.schemas.get(db.name).version = db.version; }
                } else { this.$.schemas.set(db.name, { ...db, tables: new Map }); }
            }
        }
        let dbList = [...this.$.schemas.values()].filter(db => !db.inmem).map(db => db.name);
        if (filter.name) {
            dbList = dbList.filter(dbName => dbName === filter.name);
        } else if (!filter.includeStandardExclusions) {
            const OBJ_INFOSCHEMA_DB = this.constructor.OBJ_INFOSCHEMA_DB;
            const standardExclusionsRe = new RegExp(`^${ standardExclusions.concat(OBJ_INFOSCHEMA_DB).join('|') }$`, 'i');
            dbList = dbList.filter(dbName => !standardExclusionsRe.test(dbName));
        }
        return dbList;
    }

    /**
     * Base logic for describeTable()
     * 
     * @param Function          callback
     * @param String|Object|CreateDatabase     dbSchema
     * @param Object            params
     * 
     * @return Object
     */
    async createDatabaseCallback(callback, dbSchema, params = {}) {
        let dbCreateInstance;
        if (dbSchema instanceof CreateDatabase) {
            dbCreateInstance = dbSchema;
            dbSchema = dbCreateInstance.toJson();
        } else {
            if (typeof dbSchema === 'string') { dbSchema = { name: dbSchema }; }
            if (typeof dbSchema !== 'object' || !dbSchema.name) throw new Error(`Invalid argument#1 to createDatabase().`);
            // First we validate operation
            const dbFound = (await this.databases(dbSchema))[0];
            if (dbFound) {
                if (params.ifNotExists) return;
                throw new Error(`Database ${ dbSchema.name } already exists.`);
            }
            // Then forward the operation for execution
            dbCreateInstance = CreateDatabase.fromJson(dbSchema, this.params/* global params */);
        }
        let dbApi, tablesSavepoints = new Set, onAfterCreateCalled;
        const onAfterCreate = async () => {
            onAfterCreateCalled = true;
            dbApi = this.database(dbSchema.name, params);
            delete this.$.schemas.get(dbSchema.name).inmem; // This does really exist
            this.$.schemas.get(dbSchema.name).schemaEdit = { get tablesSavepoints() { return tablesSavepoints; } };
            for (const tblSchema of dbSchema.tables || []) {
                await dbApi.createTable(tblSchema, params);
            }
            delete this.$.schemas.get(dbSchema.name).schemaEdit;
        };
        await callback(dbCreateInstance, onAfterCreate, params);
        // AFTER WE NOW EXISTS
        if (!onAfterCreateCalled) await onAfterCreate();
        // Create savepoint
        if (!(new RegExp(`^${ this.constructor.OBJ_INFOSCHEMA_DB }$`)).test(dbSchema.name)) {
            await this.createSavepoint({
                // Current state
                savepoint_desc: params.savepointDesc || 'Database init',
                name_snapshot: null, // How we know created
                tables_snapshot: JSON.stringify([]),
                // New state
                current_name: dbSchema.name,
            }, tablesSavepoints);
        }
        return dbApi;
    }

    /**
     * Base logic for alterDatabase()
     * 
     * @param Function          callback
     * @param String|Object|AlterDatabase     dbAlterRequest
     * @param Function          editCallback
     * @param Object            params
     * 
     * @return Object
     */
    async alterDatabaseCallback(callback, dbAlterRequest, editCallback, params = {}) {
        let dbAltInstance, dbName, dbSchema, dbApi, tablesSavepoints = new Set;
        let onAfterAfterCalled, onAfterAlter = () => {};
        if (dbAlterRequest instanceof AlterDatabase) {
            // Remap arguments
            dbAltInstance = dbAlterRequest;
            dbName = dbAltInstance.name;
            params = editCallback || {};
            // Create savepount data
            dbSchema = this.$.schemas.get(dbName);
            // On to snapsots; before the database changes below
            dbApi = this.database(dbName, params);
        } else if (typeof editCallback === 'function') {
            let tablesAlterRequest = [];
            if (typeof dbAlterRequest === 'object' && dbAlterRequest) {
                if (Array.isArray(dbAlterRequest.tables)) { tablesAlterRequest = dbAlterRequest.tables; }
                dbName = dbAlterRequest.name;
            } else { dbName = dbAlterRequest; }
            if (typeof dbName !== 'string') throw new Error(`Invalid argument#1 to alterDatabase().`);
            // First we validate operation
            const dbFound = (await this.databases({ name: dbName }))[0];
            if (!dbFound) throw new Error(`Database ${ dbName } does not exist.`);
            // Singleton DB schema
            dbSchema = this.$.schemas.get(dbName);
            // For recursive operations
            if (dbSchema.schemaEdit) return await editCallback(dbSchema.schemaEdit);
            // On to snapshots; before the database changes below
            dbApi = this.database(dbName, params);
            // On to editing work; but first load all necessary table schemas into memory
            const dbSchemaEdit = CreateDatabase.cloneSchema(dbSchema);
            const tableSchemas = await Promise.all(tablesAlterRequest.map(tblName => dbApi.describeTable(tblName, params)));
            Object.defineProperty(dbSchemaEdit, 'tables', { value: tableSchemas.map(tableSchema => CreateTable.cloneSchema(tableSchema)) });
            Object.defineProperty(dbSchemaEdit, 'tablesSavepoints', { get() { return tablesSavepoints; } });
            // Call for editing
            dbSchema.schemaEdit = dbSchemaEdit;
            await editCallback(dbSchemaEdit);
            // Diff into a AlterDatabase instance
            dbAltInstance = AlterDatabase.fromDiffing(dbSchema, dbSchemaEdit, { ...this.params/* global params */, database: dbName });
            const allTables = AlterTable.fromDiffing2d(tableSchemas, dbSchemaEdit.tables, { ...this.params/* global params */, database: dbName });
            // Handle tableSchema edits
            onAfterAlter = async () => {
                onAfterAfterCalled = true;
                await Promise.all(allTables.drop.map(tblName => dbApi.dropTable(tblName, params)));
                await Promise.all(allTables.add.map(tblCreateInstance => dbApi.createTable(tblCreateInstance, params)));
                await Promise.all(allTables.alter.map(tblAlterInstance => dbApi.alterTable(tblAlterInstance, params)));
                delete dbSchema.schemaEdit; // Cleanup
            };
        } else {
            throw new Error(`Alter database "${ dbName }" called without a valid callback function.`);
        }
        // ------
        // Effect changes
        const tablesSnapshot = await dbApi.tables(); // Must be before db changes below
        await callback(dbAltInstance, onAfterAlter, params);
        // AFTER WE NOW Executed ALTER
        if (!onAfterAfterCalled) await onAfterAlter();
        if (dbAltInstance.diffs.rename) {
            // Update instance objects in place
            dbSchema.name = dbAltInstance.diffs.rename;
            this.$.schemas.delete(dbName);
            this.$.schemas.set(dbSchema.name, dbSchema);
        }
        // ------
        // Create savepoint
        let savepoint;
        if ((dbAltInstance.diffs.rename || tablesSavepoints.size) && !(new RegExp(`^${ this.constructor.OBJ_INFOSCHEMA_DB }$`)).test(dbAltInstance.name)) {
            savepoint = await this.createSavepoint({
                // Current state
                savepoint_desc: params.savepointDesc || null,
                name_snapshot: dbSchema.name,
                tables_snapshot: JSON.stringify(tablesSnapshot),
                // New state
                current_name: dbAltInstance.diffs.rename || dbAltInstance.name,
            }, tablesSavepoints);
        }
        // ------
        // Done
        return savepoint;
    }

    /**
     * Base logic for dropDatabase()
     * 
     * @param Function          callback
     * @param String            dbName
     * @param Object            params
     * 
     * @return Object
     */
    async dropDatabaseCallback(callback, dbName, params = {}) {
        let dbDropInstance;
        if (dbName instanceof DropDatabase) {
            dbDropInstance = dbName;
            dbName = dbDropInstance.name;
        } else {
            // First we validate operation
            const dbFound = (await this.databases({ name: dbName }))[0];
            if (!dbFound) {
                if (params.ifExists) return;
                throw new Error(`Database ${ dbName } does not exist.`);
            }
            // Then forward the operation for execution
            dbDropInstance = new DropDatabase(dbName, this.params/* global params */);
        }
        const dbSchema = this.$.schemas.get(dbName);
        if (dbSchema.schemaEdit) throw new Error(`Cannot delete database when already in edit mode.`);
        const tablesSnapshot = await this.database(dbName, params).tables(); // Must be before db changes below
        await callback(dbDropInstance, params);
        // Then update records
        this.$.schemas.delete(dbName);
        if (!(new RegExp(`^${ this.constructor.OBJ_INFOSCHEMA_DB }$`)).test(dbSchema.name)) {
            return this.createSavepoint({
                // Current state
                savepoint_desc: params.savepointDesc || null,
                name_snapshot: dbSchema.name,
                tables_snapshot: JSON.stringify(tablesSnapshot),
                // New state
                current_name: null, // How we know deleted
            });
        }
    }

    /**
     * Method for saving snapshots to internal OBJ_INFOSCHEMA db.
     * 
     * @param Object            entry
     * @param Set               tblEntires
     * 
     * @return Object
     */
    async createSavepoint(entry, tblEntries = new Set) {
        // Commit to DB
        const OBJ_INFOSCHEMA_DB = this.constructor.OBJ_INFOSCHEMA_DB;
        const infoSchemaDB = this.database(OBJ_INFOSCHEMA_DB);
        if (!(await this.databases({ name: OBJ_INFOSCHEMA_DB }))[0]) {
            await this.createDatabase(OBJ_INFOSCHEMA_DB);
            await infoSchemaDB.createTable({
                name: 'database_savepoints',
                columns: [
                    { name: 'id', type: 'int', primaryKey: true, identity: { always: true } },
                    { name: 'name_snapshot', type: 'varchar' },
                    { name: 'tables_snapshot', type: 'json' },
                    { name: 'savepoint_desc', type: 'varchar' },
                    { name: 'savepoint_date', type: 'timestamp' },
                    { name: 'rollback_date', type: 'timestamp' },
                    { name: 'current_name', type: 'varchar' },
                ],
            });
            await infoSchemaDB.createTable({
                name: 'table_savepoints',
                columns: [
                    { name: 'id', type: 'int', primaryKey: true, identity: { always: true } },
                    { name: 'savepoint_id', type: 'int', references: { table: 'database_savepoints', columns: ['id'], deleteRule: 'cascade' } },
                    { name: 'name_snapshot', type: 'varchar' },
                    { name: 'columns_snapshot', type: 'json' },
                    { name: 'constraints_snapshot', type: 'json' },
                    { name: 'indexes_snapshot', type: 'json' },
                    { name: 'current_name', type: 'varchar' },
                ],
            });
        }
        await infoSchemaDB.table('database_savepoints').add({ ...entry, savepoint_date: 'now()' });
        const savepoint = await this.database(entry.current_name).savepoint({ force: true });
        if (tblEntries.size) {
            tblEntries = [...tblEntries].map(tblEntry => ({ ...tblEntry, savepoint_id: savepoint.id }));
            await infoSchemaDB.table('table_savepoints').addAll(tblEntries);
        }
        return savepoint;
    }














    // ---------------------














    userPrompt(message) {
        if (typeof alert !== 'undefined') {
            alert(message);
        } else {
            console.log(message);
        }
    }

    /**
     * ---------
     * IMPORT/EXPORT
     * ---------
     */

    /**
     * Imports a database.
     * 
     * @param String dbName
     * @param Object databaseDump
     * @param Object params
     * 
     * @return Array
     */
    async importDatabase(dbName, databaseDump, params = {}) {
        if ((await this.databases({ name: dbName })).length) {
            if (params.ifNotExists) return;
            throw new Error(`Database ${ dbName } already exists.`);
        }
        if (!_isObject(databaseDump.schema) || (databaseDump.data && !_isObject(databaseDump.data))) {
            throw new Error(`Malformed import data.`);
        }
        const database = await this.createDatabase(dbName, params);
        return Promise.all(Object.keys(databaseDump.schema).map(async tableName => {
            const tableSchema = databaseDump.schema[tableName];
            const tableData = (databaseDump.data || {})[tableName];
            if (_isNumeric(tableName)) { tableName = tableSchema.name; }
            if (!tableName || !_isObject(tableSchema) || (tableData && !_isArray(tableData))) {
                throw new Error(`Malformed import data for table ${tableName}.`);
            }
            const table = await database.createTable(tableName, tableSchema);
            return table.addAll(tableData || []);
        }));
    }

    /**
     * Exports a database.
     * 
     * @param String dbName
     * @param Object params
     * 
     * @return Array
     */
    async exportDatabase(dbName, params) {
        if (!(await this.databases({ name: dbName })).length) {
            if (params.ifExists) return;
            throw new Error(`Database ${ dbName } does not exist.`);
        }
        const database = await this.database(dbName, params);
        // -------------------
        const databaseDump = { schema: {}, data: {} };
        // -------------------
        const tableNames = await database.tables();
        for (const tableName of tableNames) {
            const table = await database.table(tableName);
            databaseDump.schema[tableName] = await table.getSchema();
            databaseDump.data[tableName] = await table.getAll();
        }
        return databaseDump;
    }

    /**
     * ---------------------------------------
     */

    /**
     * Returns the database schema.
     * 
     * @param String dbName 
     * 
     * @returns Object
     */
    getDatabaseSchema(dbName = this.defaultDB) {
        return this.$.schema[dbName] || {};
    }

    /**
     * Sets the database schema.
     * 
     * @param String dbName 
     * @param Object dbSchema 
     * 
     * @returns this
     */
    setDatabaseSchema(dbName, dbSchema) {
        const _dbSchema = {};
        _each(dbSchema, (tablenName, tableSchema) => {
            if (tableSchema.name && tableSchema.name !== tablenName) {
                _dbSchema[tableSchema.name] = tableSchema;
                delete tableSchema.name;
            } else {
                _dbSchema[tablenName] = tableSchema;
            }
        });
        this.$.schema[dbName] = _dbSchema;
        return this;
    }

    /**
     * Removes the database schema.
     * 
     * @param String dbName 
     * 
     * @returns this
     */
    unsetDatabaseSchema(dbName) {
        delete this.$.schema[dbName];
        return this;
    }
}