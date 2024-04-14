
/**
 * @imports
 */
import { _isObject, _isNumeric, _isBoolean } from '@webqit/util/js/index.js';
import { _from as _arrFrom, _intersect, _unique, _difference } from '@webqit/util/arr/index.js';
import CreateTable from '../statement/schema/CreateTable.js';
import AlterTable from '../statement/schema/AlterTable.js';
import DropTable from '../statement/schema/DropTable.js';
import Savepoint from '../statement/schema/Savepoint.js';

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
     * @property Bool
     */
    get dropped() { return this.$.schema.hiddenAs === 'dropped'; }
	
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
                hiddenAs: 'inmemory',
            });
        }
        return new this.constructor.Table(this, ...arguments);
    }

    /**
	 * Returns the database's current savepoint.
	 * 
     * @param Object params
	 * 
	 * @returns Object
     */
    async savepoint(params = {}) {
        if (!this.$.schema.savepoint || this.$.schema.savepoint.isRolledback || params.direction === 'forward' || params.force) {
            const OBJ_INFOSCHEMA_DB = this.client.constructor.OBJ_INFOSCHEMA_DB;
            if ((await this.client.databases({ name: OBJ_INFOSCHEMA_DB }))[0]) {
                const dbName = `${ OBJ_INFOSCHEMA_DB }.database_savepoints`;
                const sql = params.direction === 'forward'
                    ? `SELECT following.* FROM ${ dbName } AS active LEFT JOIN ${ dbName } AS following ON following.name_snapshot = active.current_name WHERE '${ this.name }' IN (active.name_snapshot,active.current_name) AND active.rollback_date IS NOT NULL ORDER BY active.savepoint_date ASC LIMIT 1`
                    : `SELECT preceding.*, active.id AS id_active FROM ${ dbName } AS preceding LEFT JOIN ${ dbName } AS active ON active.name_snapshot = preceding.current_name WHERE '${ this.name }' IN (preceding.name_snapshot,preceding.current_name) AND preceding.rollback_date IS NULL ORDER BY preceding.savepoint_date DESC LIMIT 1`;
                const result = await this.client.query(sql, [], { isStandardSql: true });
                const savepoint = result[0] && new Savepoint(this.client, result[0], params.direction);
                if (params.direction === 'forward') return savepoint; // No cache
                this.$.schema.savepoint = savepoint;
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
                    delete tablesMap.get(tbl.name).hiddenAs;
                } else { tablesMap.set(tbl.name, { ...tbl }); }
            }
        }
        let tblList = [...tablesMap.values()].filter(tbl => !tbl.hiddenAs).map(tbl => tbl.name);
        if (filter.name) { tblList = tblList.filter(tblName => tblName === filter.name); }
        return tblList;
    }

    /**
     * Base logic for describeTable()
     * 
     * @param Function          callback
     * @param String|Array      tblName_s
     * @param Object            params
     * 
     * @return Object
     */
    async describeTableCallback(callback, tblName_s, params = {}) {
        const isMultiple = Array.isArray(tblName_s);
        const tblNames = isMultiple ? tblName_s : [tblName_s];
        const isAll = tblNames.length === 1 && tblNames[0] === '*';
        if (this.dropped) return isAll || isMultiple ? [] : undefined;
        const tablesMap = this.$.schema.tables;
        const requestList = isAll ? ['*'] : tblNames.filter(tblName => !tablesMap.get(tblName)?.columns && !tablesMap.get(tblName)?.hiddenAs);
        if (requestList.length) {
            const tblSchemas = await callback(requestList, params); // Describe should always add constraint names
            for (const tblSchema of tblSchemas) {
                if (tablesMap.has(tblSchema.name)) {
                    delete tablesMap.get(tblSchema.name).hiddenAs;
                    Object.assign(tablesMap.get(tblSchema.name), tblSchema);
                } else { tablesMap.set(tblSchema.name, tblSchema); }
            }
        }
        if (isAll) return [...tablesMap.values()].filter(tbl => !tbl.hiddenAs);
        if (isMultiple) return tblNames.map(tblName => tablesMap.get(tblName)).filter(tbl => !tbl.hiddenAs);
        return !tablesMap.get(tblName_s)?.hiddenAs ? tablesMap.get(tblName_s) : undefined;
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
            let tblCreateRequest;
            if (tblSchema instanceof CreateTable) {
                tblCreateRequest = tblSchema;
                tblSchema = tblCreateRequest.toJson();
            } else {
                const tblFound = (await this.tables({ name: tblSchema.name }))[0];
                if (tblFound) {
                    if (params.ifNotExists) return;
                    throw new Error(`Table ${ tblSchema.name } already exists.`);
                }
                if (tblSchema.database && tblSchema.database !== this.name) {
                    throw new Error(`A table schema of database ${ tblSchema.database } is being passed to ${ this.name }.`);
                }
                tblCreateRequest = CreateTable.fromJson(tblSchema, { ...this.params/* global params */, database: this.name });
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
            await callback(tblCreateRequest, params);
            // Update original objects in place
            const tablesMap = this.$.schema.tables;
            if (tablesMap.get(tblSchema.name)?.hiddenAs) {
                delete tablesMap.get(tblSchema.name).hiddenAs; // This does really exist now
            } else {
                tablesMap.set(tblSchema.name, { name: tblSchema.name });
            }
        }, { savepointDesc: 'Table create', ...params });
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
            let tblAlterRequest, tblSchema;
            if (tblName instanceof AlterTable) {
                // Remap arguments
                tblAlterRequest = tblName;
                tblName = tblAlterRequest.target.name;
                params = editCallback || {};
                // Create savepount data
                tblSchema = tblAlterRequest.target.columns ? tblAlterRequest.target : await this.describeTable(tblName, params);
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
                tblAlterRequest = AlterTable.fromDiffing(tblSchema, tblSchema.schemaEdit, this.client.params);
                delete tblSchema.schemaEdit;
            } else {
                throw new Error(`Alter table "${ tblName }" called with invalid arguments.`);
            }
            const newTblName = tblAlterRequest.actions.find(action => action.type === 'RENAME' && !action.reference)?.argument;
            const newTblLocation = tblAlterRequest.actions.find(action => action.type === 'RELOCATE')?.argument;
            if (tblAlterRequest.actions.length) {
                // Create savepoint
                for (const action of tblAlterRequest.actions) {
                    if (action.type === 'RENAME' && action.reference) {
                        const listName = action.reference.type === 'CONSTRAINT' ? 'constraints' : (action.reference.type === 'INDEX' ? 'indexes' : 'columns');
                        const nameKey = listName === 'constraints' ? 'constraintName' : (listName === 'indexes' ? 'indexName' : 'name');
                        tblSchema[listName].find(obj => obj[nameKey] === action.reference.name)[`$${ nameKey }`] = action.argument;
                    }
                }
                dbSchemaEdit.tablesSavepoints.add({
                    // Snapshot
                    name_snapshot: tblSchema.name,
                    columns_snapshot: JSON.stringify(tblSchema.columns),
                    constraints_snapshot: JSON.stringify(tblSchema.constraints || []),
                    indexes_snapshot: JSON.stringify(tblSchema.indexes || []),
                    // New state
                    current_name: newTblName || tblName,
                });
                // Effect changes
                await callback(tblAlterRequest, params);
            }
            // Update original schema object in place
            // This lets describeTable() know to lookup remote db
            const tablesMap = this.$.schema.tables;
            delete tablesMap.get(tblName).columns;
            if (newTblName) { tblSchema.name = newTblName; }
            if (newTblLocation) {
                tblSchema.database = newTblLocation;
                tablesMap.delete(tblName);
            }
        }, { savepointDesc: 'Table alter', ...params });
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
            let tblDropRequest;
            if (tblName instanceof DropTable) {
                tblDropRequest = tblName;
                tblName = tblDropRequest.name;
            } else {
                // First we validate operation
                const tblFound = (await this.tables({ name: tblName }))[0];
                if (!tblFound) {
                    if (params.ifExists) return;
                    throw new Error(`Table ${ tblName } does not exist.`);
                }
                // Then forward the operation for execution
                tblDropRequest = new DropTable(tblName, this.name, params);
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
            await callback(tblDropRequest, params);
            // Then update original schema object in place
            const tablesMap = this.$.schema.tables;
            tablesMap.get(tblName).hiddenAs = 'dropped';
            delete tablesMap.get(tblName).columns;
            delete tablesMap.get(tblName).constraints;
            delete tablesMap.get(tblName).indexes;
        }, { savepointDesc: 'Table drop', ...params });
    }
}