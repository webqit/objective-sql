

/**
 * @imports
 */
import Driver from '../_Driver.js';
import _isNumeric from '@webqit/util/js/isNumeric.js';
import ObjSQL from '../../index.js';
import SQLDatabase from './SQLDatabase.js';

/**
 * ---------------------------
 * SQLDriver class
 * ---------------------------
 */				

export default class SQLDriver extends Driver {

    /**
     * Instance.
     * 
     * @param Object params 
     * @param String sqlClient 
     */
    constructor(sqlClient, params) {
        super();
        this.name = 'sql';
        this.sqlClient = sqlClient;
        this.params = params;
    }

    /**
     * ---------
     * CONNECT
     * ---------
     */

    /**
     * Connects to an SQL database.
     * 
     * @param Object params 
     * @param String sqlClient 
     * 
     * @returns this
     */
    static connect(sqlClient, params) {
        return new this(sqlClient, params);
    }

    /**
     * Returns the active SQL connection.
     * 
     * @return Promise
	 */
    async getConnection() {
        if (!this.conn) {
            const SqlClient = await import(this.sqlClient);
            var conn = SqlClient.createConnection({
                host: this.params.host,
                user: this.params.user,
                password: this.params.password,
            });
            this.conn = new Promise((resolve, reject) => {
                conn.connect(err => {
                    if (err) return reject(err);
                    conn.query(`SELECT database() AS default_db`, (err, result) => {
                        if (err) return reject(err);
                        var defaultDB = (result[0] || {}).default_db;
                        if (defaultDB) {
                            this.defaultDB = defaultDB;
                        }
                        resolve(conn);
                    });
                });
            });
        }
        return this.conn;
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
        var conn = await this.getConnection();
        return new Promise((resolve, reject) => {
            conn.query('USE ' + databaseName, err => {
                if (err) return reject(err);
                resolve(super.setDefaultDB(databaseName, params));
            });
        });
	}
    
	/**
     * Returns a list of databases.
     * 
     * @param String databaseName
     * @param Object params
     * @param Bool includeSystemDBs
     * 
     * @return Array
	 */
    async databases(databaseName = null, params = {}, includeSystemDBs = false) {
        var conn = await this.getConnection();
        var databaseList = await new Promise((resolve, reject) => {
            conn.query('SHOW DATABASES', (err, result) => {
                if (err) return reject(err);
                if (!includeSystemDBs) {
                    var systemDBs = ['information_schema', 'mysql', 'performance_schema', 'sys'];
                    result = result.filter(row => !systemDBs.includes(row.Database));
                }
                resolve(result.map(row => {
                    return {name: row.Database};
                }));
            });
        });
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
        var databases = await this.databases();
        if (!databases.filter(d => d.name = databaseName && d.version === params.version).length) {
            // Fire upgradedneeded!
        }
        return new SQLDatabase(this, databaseName, {
            ...this.$.databases[databaseName]
        }, params);
	}


    /**
     * ---------
     * CREATE/DROP
     * ---------
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
        if (params.version && !_isNumeric(params.version)) {
            throw new Error(`Database version (params.version) must be numeric.`);
        }
        var conn = await this.getConnection();
        return new Promise((resolve, reject) => {
            // Drop-on-exists, if specified in onExist, would have been fullfiled as super.create()
            conn.query(`CREATE DATABASE${params.ifNotExists ? ` IF NOT EXISTS` : ``} ${databaseName}`, err => {
                if (err) return reject(err);
                // ----------------
                this.$.databases[databaseName] = {schema: {}};
                // ----------------
                this.setDefaultDB(databaseName, params).then(() => {
                    resolve(new SQLDatabase(this, databaseName, {
                        ...this.$.databases[databaseName]
                    }, params));
                });
            });
        });
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
        var conn = await this.getConnection();
        return new Promise((resolve, reject) => {
            conn.query(`DROP DATABASE${params.ifExists ? ` IF EXISTS` : ``} ${databaseName}`, err => {
                if (err) return reject(err);
                // ----------------
                delete this.$.databases[databaseName];
                // ----------------
                resolve(true);
            });
        });
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
        var conn = await this.getConnection();
        params = {...params};
        params.vars = vars;
        params.dbDriver = this;
        var sql = ObjSQL.parse(query, null, params).stringify({interpreted: true});
        return new Promise((resolve, reject) => {
            conn.query(sql, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }
}