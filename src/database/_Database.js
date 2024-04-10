

/**
 * @imports
 */
import { _isObject, _isNumeric, _isBoolean } from '@webqit/util/js/index.js';
import { _from as _arrFrom, _intersect, _unique, _difference } from '@webqit/util/arr/index.js';
import CreateTable from '../statement/schema/CreateTable.js';
import AlterTable from '../statement/schema/AlterTable.js';
import DropTable from '../statement/schema/DropTable.js';

/**
 * ---------------------------
 * _Database class
 * ---------------------------
 */				

export default class _Database {
	
	/**
	 * @constructor
	 */
	constructor(client, dbName, params) {
        this.$ = {
            client,
            schema: client.$.schemas.get(dbName),
            params
        };
	}

    /**
     * @property Client
     */
    get client() { return this.$.client; }

    /**
     * @property String
     */
    get name() { return this.$.schema.name; }

    /**
     * @property Object
     */
    get params() { return this.$.params; }
	
    /**
     * Returns list of tables.
     * 
     * @param Object            params
     * 
     * @return Array
     */
    async tables(params = {}) { return this.tablesCallback(() => ([]), ...arguments); }

    /**
     * Describes table.
     * 
     * @param String            tblName
     * @param Object            params
     * 
     * @return Object
     */
    async describeTable(tblName, params = {}) { return this.describeTableCallback((tblName, params) => {}, ...arguments); }

    /**
     * Creates table.
     * 
     * @param String            tblName
     * @param Object            tblSchema
     * @param Object            params
     * 
     * @return Object
     */
    async createTable(tblName, tblSchema = {}, params = {}) { return this.createTableCallback(() => ([]), ...arguments); }

    /**
     * Forwards to: createTable().
     * @with: params.ifNotExixts = true
     */
    async createTableIfNotExists(tblName, tblSchema = {}, params = {}) { return this.createTable(tblName, tblSchema, { ...params, ifNotExists: true }); }

    /**
     * Alters table.
     * 
     * @param String            tblName
     * @param Object            tblSchema
     * @param Object            params
     * 
     * @return Bool
     */
    async alterTable(tblName, tblSchema, params = {}) { return this.alterTableCallback((tblName, tblSchema, params) => {}, ...arguments); }

    /**
     * Drops table.
     * 
     * @param String            tblName
     * @param Object            params
     * 
     * @return Bool
     */
    async dropTable(tblName, params = {}) { return this.dropTableCallback((tblName, params) => {}, ...arguments); }

    /**
     * Forwards to: dropTable().
     * @with: params.ifExixts = true
     */
    async dropTableIfExists(tblName, params = {}) { return this.dropTable(tblName, { ...params, ifNotExists: true }); }

    /**
     * Returns a table instance.
     * 
     * @param String            tblName
     * @param Object            params
     * 
     * @return Bool
     */
    table(tblName, params = {}) {
        const tablesMap = this.$.schema.tables;
        if (!tablesMap.has(tblName)) {
            tablesMap.set(tblName, {
                name: tblName,
                inmem: true,
            });
        }
        return new this.constructor.Table(this, ...arguments);
    }

    /**
     * BASE LOGICS
     */

    /**
	 * Returns the database's current savepoint.
	 * 
     * @param Object params
	 * 
	 * @returns Object
     */
    async savepoint(params = {}) {
        if (!this.$.schema.savepoint || params.force) {
            const OBJ_INFOSCHEMA_DB = this.client.constructor.OBJ_INFOSCHEMA_DB;
            if ((await this.client.databases({ name: OBJ_INFOSCHEMA_DB }))[0]) {
                const result = await this.client.query(`SELECT id, name_snapshot, tables_snapshot, savepoint_desc, savepoint_date FROM ${ OBJ_INFOSCHEMA_DB }.database_savepoints WHERE current_name = '${ this.name }' AND rollback_date IS NULL ORDER BY savepoint_date DESC LIMIT 1`, [], { isStandardSql: true });
                this.$.schema.savepoint = result[0];
            }
        }
        return this.$.schema.savepoint;
    }

    /**
     * Base logic for the tables() method.
     * 
     * @param Function callback
     * @param Object filter
     * 
     * @return Array
     */
    async tablesCallback(callback, filter = {}) {
        const tablesMap = this.$.schema.tables;
        if (!tablesMap._touched || filter.force) {
            tablesMap._touched = true;
            for (let tbl of await callback()) {
                if (typeof tbl === 'string') { tbl = { name: tbl }; }
                if (tablesMap.has(tbl.name)) {
                    delete tablesMap.get(tbl.name).inmem;
                } else { tablesMap.set(tbl.name, { ...tbl }); }
            }
        }
        let tblList = [...tablesMap.values()].filter(tbl => !tbl.inmem).map(tbl => tbl.name);
        if (filter.name) { tblList = tblList.filter(tblName => tblName === filter.name); }
        return tblList;
    }

    /**
     * Base logic for describeTable()
     * 
     * @param String            tblName
     * @param Function          callback
     * @param Object            params
     * 
     * @return Object
     */
    async describeTableCallback(callback, tblName, params = {}) {
        // First we validate operation
        const tblFound = (await this.tables({ name: tblName }))[0];
        if (!tblFound) { throw new Error(`Table ${ tblName } does not exist.`); }
        const tablesMap = this.$.schema.tables;
        if (!tablesMap.get(tblName)?.columns) {
            const tblSchema = await callback(tblName, params); // Describe should always add constraint names
            tablesMap.set(tblName, tblSchema);
        }
        return tablesMap.get(tblName);
    }

    /**
     * Base logic for createTable()
     * 
     * @param Function          callback
     * @param Object            tblSchema
     * @param Object            params
     */
    async createTableCallback(callback, tblSchema, params = {}) {
        await this.client.alterDatabase(this.name, async dbSchemaEdit => {
            let tblCreateInstance;
            if (tblSchema instanceof CreateTable) {
                tblCreateInstance = tblSchema;
                tblSchema = tblCreateInstance.toJson();
            } else {
                const tblFound = (await this.tables({ name: tblSchema.name }))[0];
                if (tblFound) {
                    if (params.ifNotExists) return;
                    throw new Error(`Table ${ tblSchema.name } already exists.`);
                }
                if (tblSchema.database && tblSchema.database !== this.name) {
                    throw new Error(`A table schema of database ${ tblSchema.database } is being passed to ${ this.name }.`);
                }
                tblCreateInstance = CreateTable.fromJson(tblSchema, { ...this.params/* global params */, database: this.name });
            }
            // Create savepoint
            dbSchemaEdit.tablesSavepoints.add({
                // Snapshot
                name_snapshot: null,
                columns_snapshot: JSON.stringify([]),
                constraints_snapshot: JSON.stringify([]),
                indexes_snapshot: JSON.stringify([]),
                // New state
                current_name: tblSchema.name
            });
            await callback(tblCreateInstance, params);
            // Update original objects in place
            const tablesMap = this.$.schema.tables;
            if (tablesMap.get(tblSchema.name)?.inmem) {
                delete tablesMap.get(tblSchema.name).inmem;
            } else {
                tablesMap.set(tblSchema.name, { name: tblSchema.name });
            }
        }, params);
        return this.table(tblSchema.name, params);
    }

    /**
     * Base logic for alterTable()
     * 
     * @param Function          callback
     * @param String            tblName
     * @param Function          editCallback
     * @param Object            params
     */
    async alterTableCallback(callback, tblName, editCallback, params = {}) {
        return this.client.alterDatabase(this.name, async dbSchemaEdit => {
            let tblAltInstance, tblSchema;
            if (tblName instanceof AlterTable) {
                // Remap arguments
                tblAltInstance = tblName;
                tblName = tblAltInstance.name;
                params = editCallback || {};
                // Create savepount data
                tblSchema = tblAltInstance.jsonA || await this.describeTable(tblName, params);
            } else if (typeof editCallback === 'function') {
                // First we validate operation
                const tblFound = (await this.tables({ name: tblName }))[0];
                if (!tblFound) throw new Error(`Table ${ tblName } does not exist.`);
                // Singleton TBL schema
                tblSchema = await this.describeTable(tblName, params);
                // For recursive edits
                if (tblSchema.schemaEdit) return await editCallback(tblSchema.schemaEdit);
                // Fresh edit
                tblSchema.schemaEdit = CreateTable.cloneSchema(tblSchema); // One global object
                // ------
                // Call for modification
                await editCallback(tblSchema.schemaEdit);
                // Diff into a AlterTable instance
                tblAltInstance = AlterTable.fromDiffing(tblSchema, tblSchema.schemaEdit, this.client.params);
                delete tblSchema.schemaEdit;
            } else {
                throw new Error(`Alter table "${ tblName }" called with invalid arguments.`);
            }
            if (tblAltInstance.nodeTypes.length) {
                // Create savepoint
                dbSchemaEdit.tablesSavepoints.add({
                    // Snapshot
                    name_snapshot: tblSchema.name,
                    columns_snapshot: JSON.stringify(tblSchema.columns),
                    constraints_snapshot: JSON.stringify(tblSchema.constraints),
                    indexes_snapshot: JSON.stringify(tblSchema.indexes),
                    // New state
                    current_name: tblAltInstance.diffs.rename || tblAltInstance.name,
                });
                // Effect changes
                await callback(tblAltInstance, params);
            }
            // Update original schema object in place
            if (tblAltInstance.nodeTypes.includes('database')) {
                tblSchema.database = tblAltInstance.diffs.relocate;
            } else if (tblAltInstance.nodeTypes.includes('name')) {
                tblSchema.name = tblAltInstance.diffs.rename;
            }
            // Unset from global location so that describeTable() knows to lookup remote db
            this.$.schema.tables.delete(tblName);
        }, params);
    }

    /**
     * Base logic for dropTable()
     * 
     * @param Function          callback
     * @param String            tblName
     * @param Object            params
     * 
     * @return Object
     */
    async dropTableCallback(callback, tblName, params = {}) {
        return this.client.alterDatabase(this.name, async dbSchemaEdit => {
            let tblDropInstance;
            if (tblName instanceof DropTable) {
                tblDropInstance = tblName;
                tblName = tblDropInstance.name;
            } else {
                // First we validate operation
                const tblFound = (await this.tables({ name: tblName }))[0];
                if (!tblFound) {
                    if (params.ifExists) return;
                    throw new Error(`Table ${ tblName } does not exist.`);
                }
                // Then forward the operation for execution
                tblDropInstance = new DropTable(tblName, this.name, params);
            }
            // Create savepoint
            const tblSchema = await this.describeTable(tblName, params);
            if (tblSchema.schemaEdit) throw new Error(`Cannot delete table when already in edit mode.`);
            dbSchemaEdit.tablesSavepoints.add({
                // Snapshot
                name_snapshot: tblSchema.name,
                columns_snapshot: JSON.stringify(tblSchema.columns),
                constraints_snapshot: JSON.stringify(tblSchema.constraints),
                indexes_snapshot: JSON.stringify(tblSchema.indexes),
                // New state
                current_name: null, // How we know deleted
            });
            await callback(tblDropInstance, params);
            // Then update original schema object in place
            this.$.schema.tables.delete(tblName);
        });
    }
}