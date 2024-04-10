

/**
 * @imports
 */
import Parser from '../../Parser.js';
import _Client from '../_Client.js';
import SQLDatabase from './SQLDatabase.js';

/**
 * ---------------------------
 * SQLClient class
 * ---------------------------
 */				

export default class SQLClient extends _Client {

    /**
     * Instance.
     * 
     * @param Object params 
     */
    constructor(driver, params = {}) {
        if (typeof driver !== 'object') throw new Error(`The options.driver parameter is required and must be an object.`);
        if (typeof driver.query !== 'function') throw new Error(`The provided driver must expose a .query() function.`);
        super(driver, params);
    }

    /**
	 * Client kind.
     * 
     * @property String
	 */
    static kind = 'sql';

    /**
	 * Database class.
     * 
     * @property Object
	 */
    static Database = SQLDatabase;

    /**
	 * List: system database.
     * 
     * @var Array
	 */
    static systemDBs = [ 'information_schema', 'mysql', 'performance_schema', 'sys', 'pg_catalog', 'pg_toast', 'public' ];

	/**
	 * Sets default database.
	 * 
	 * @param String dbName
	 * @param Object params
     * 
     * @return String|Null
	 */
	async defaultDatabase(...args) {
        return this.defaultDatabaseCallback(dbName => {
            return new Promise((resolve, reject) => {
                const driver = this.driver;
                if (dbName) {
                    return driver.query('USE ' + dbName, (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                }
                const sql = `SELECT ${ this.params.dialect === 'mysql' ? 'database()' : 'current_database()' } AS default_db`;
                return driver.query(sql, (err, result) => {
                    if (err) return reject(err);
                    const rows = result.rows || result;
                    resolve((rows[0] || {}).default_db);
                });
            });
        }, ...args);
	}

	/**
     * Returns a list of databases.
     * 
     * @param Object params
     * 
     * @return Array
	 */
    async databases(params = {}) {
        return this.databasesCallback(() => {
            return new Promise((resolve, reject) => {
                const sql = `SELECT schema_name FROM information_schema.schemata`;
                return this.driver.query(sql, (err, result) => {
                    if (err) return reject(err);
                    resolve((result.rows || result).map(row => row.schema_name));
                });
            });
        }, params, this.constructor.systemDBs);
	}

    /**
     * Creates a database.
     * 
     * @param String dbName
     * @param Object params
     * 
     * @return Bool
     */
    async createDatabase(dbName, params = {}) {
        return this.createDatabaseCallback((dbCreateInstance, handleTables, params) => {
            return new Promise((resolve, reject) => {
                return this.driver.query(dbCreateInstance.toString(), (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });
        }, ...arguments);
    }

    /**
     * Alters a database.
     * 
     * @param String    dbName
     * @param Function  schemaCallback
     * @param Object    params
     * 
     * @return Bool
     */
    async alterDatabase(dbName, schemaCallback, params = {}) {
        return this.alterDatabaseCallback(async (dbAlterInstance, handleTables, params) => {
            if (!dbAlterInstance.nodeTypes.length) return;
            await handleTables(); // Handle tables before rename DB
            return new Promise((resolve, reject) => {
                return this.driver.query(dbAlterInstance.toString(), (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });
        }, ...arguments);
    }

    /**
     * Drops a database.
     * 
     * @param String dbName
     * @param Object params
     * 
     * @return Bool
     */
    async dropDatabase(dbName, params = {}) {
        return this.dropDatabaseCallback((dbDropInstance, params) => {
            return new Promise((resolve, reject) => {
                return this.driver.query(dbDropInstance.toString(), (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });
        }, ...arguments);
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
        const sql = params.isStandardSql || !/^SELECT[ ]/i.test(query) ? query : (await Parser.parse(query, null, { ...params, vars, dbClient: this })).stringify({ interpreted: true });
        return new Promise((resolve, reject) => {
            this.driver.query(sql, (err, result) => {
                if (err) return reject(err);
                resolve(result.rows || result);
            });
        });
    }
}