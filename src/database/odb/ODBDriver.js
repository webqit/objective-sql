
/**
 * @imports
 */
import _arrFrom from '@webqit/util/arr/from.js';
import _isNumeric from '@webqit/util/js/isNumeric.js';
import Driver from '../_Driver.js';
import ODBDatabase from './ODBDatabase.js';

/**
 * ---------------------------
 * ODBDriver class
 * ---------------------------
 */				
 
export default class ODBDriver extends Driver {

    /**
     * Instance.
     */
    constructor() {
        super();
        this.$.data = {};
        this.name = 'odb';
    }

	/**
     * Returns a list of databases.
     * 
     * @param String databaseName
     * @param Object params
     * 
     * @return Array
	 */
    async databases(databaseName = null, params = {}) {
        var databaseList = Object.keys(this.$.schema).map(name => ({name}));
        return this.matchDatabaseList(databaseList, databaseName, params);
	}

    /**
     * Returns a database handle.
     * 
     * @param String databaseName
     * @param Object params
     * 
     * @return SQLDatabase
     */
    async database(databaseName = this.defaultDB, params = this.defaultDBParams) {
        if (params.version && !_isNumeric(params.version)) {
            throw new Error(`Database version (params.version) must be numeric.`);
        }
        var databases = await this.databases(databaseName, params);
        if (!databases.length) {
            // Fire upgradedneeded!
        }
        if (!(databaseName in this.$.data)) {
            // ----------------
            this.setDatabaseSchema(databaseName, {});
            this.$.data[databaseName] = {};
            // ----------------
        }
        return new ODBDatabase(this, databaseName, {
            schema: this.getDatabaseSchema(databaseName),
            data: this.$.data[databaseName],
        }, params);
    }

    /**
     * CREATE/DROP
     */

    /**
     * Creates.
     * 
     * @param String databaseName
     * @param Object params
     * 
     * @return Object
     */
    async createDatabase(databaseName, params = this.defaultDBParams) {
        if ((await this.databases(databaseName, params)).length) {
            if (params.ifNotExists) {
                return;
            }
            throw new Error(`Database ${databaseName} already exists.`);
        }
        // ----------------
        this.setDatabaseSchema(databaseName, {});
        this.$.data[databaseName] = {};
        // ----------------
        await this.setDefaultDB(databaseName, params);
        return new ODBDatabase(this, databaseName, {
            schema: this.getDatabaseSchema(databaseName),
            data: this.$.data[databaseName],
        }, params);
    }

    /**
     * Drops a database.
     * 
     * @param String databaseName
     * @param Object params
     * 
     * @return Bool
     */
    async dropDatabase(databaseName, params = {}) {
        if (!(await this.databases(databaseName, params)).length) {
            if (params.ifExists) {
                return;
            }
            throw new Error(`Database ${databaseName} does not exist.`);
        }
        this.unsetDatabaseSchema(databaseName);
    }

    /**
     * ---------
     * QUERY
     * ---------
     */
    
    /**
     * @inheritdoc
     */
    async query(query, vars = [], params = {}) {
        params = {...params};
        params.vars = vars;
        params.dbDriver = this;
        return ObjSQL.parse(query, null, params).eval(this);
    }
}