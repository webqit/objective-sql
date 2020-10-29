

/**
 * @imports
 */
//import MySQL from 'mysql';
import MySQL from '../../../../site/node_modules/mysql/index.js';
import _Factory from '../_Factory.js';
import SQLDatabase, { databaseCreateSchema } from './SQLDatabase.js';
import Rql from '../../index.js';

/**
 * ---------------------------
 * SQLFactory class
 * ---------------------------
 */				

export default class SQLFactory extends _Factory {

    /**
     * ---------
     * CONNECT
     * ---------
     */
	 
	/**
     * Establishes a MySQL connection.
     * 
     * @param Object params
     * 
     * @return Promise
	 */
	static connect(params) {
        var conn = MySQL.createConnection({
            host: params.host,
            user: params.user,
            password: params.password,
        });
        this.conn = new Promise((resolve, reject) => {
            conn.connect(err => {
                if (err) return reject(err);
                resolve(conn);
            });
        });
    }

    /**
     * Returns the active MySQL connection.
     * 
     * @return Promise
	 */
    static getConnection() {
        if (!this.conn) {
            throw new Error('A connection has not been made to the SQL server.');
        }
        return this.conn;
    }

    /**
     * ---------
     * QUERY
     * ---------
     */
	 
	/**
     * @inheritdoc
	 */
	static async _query(query, params = {}) {
        var conn = await this.getConnection();
        params.DB_FACTORY = this;
        var sql = Rql.parse(query, null, params).stringify({interpreted: true});
        return new Promise((resolve, reject) => {
            conn.query(sql, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }
    
    /**
     * ---------
     * API
     * ---------
     */
	 
	/**
     * Returns a list of databases.
     * 
     * @return Array
	 */
	static async list() {
        var conn = await this.getConnection();
        return new Promise((resolve, reject) => {
            conn.query('SHOW DATABASES', (err, result) => {
                if (err) return reject(err);
                resolve(result.map(row => {
                    return {name: row.database, version: 0};
                }));
            });
        });
	}
	 
	/**
	 * Opens a database.
	 * 
	 * @inheritdoc
	 */
	static async open(databaseName = this.defaultDB, version = 0) {
        var conn = await this.getConnection();
        return new Promise((resolve, reject) => {
            conn.query('USE ' + databaseName, err => {
                if (err) return reject(err);
                var db = new SQLDatabase({name: databaseName, conn}, this.schema[databaseName]);
                resolve(db);
            });
        });
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
     * @param Array  schema
     * @param String  onExists
     * 
     * @return Bool
     */
    static async _create(databaseName, schema, onExists = null) {
        var conn = await this.getConnection();
        return new Promise((resolve, reject) => {
            // Drop-on-exists, if specified in onExist, would have been fullfiled as super.create()
            conn.query('CREATE DATABASE IF NOT EXISTS ' + databaseName, err => {
                if (err) return reject(err);
                conn.query('USE ' + databaseName, err => {
                    if (err) return reject(err);
                    // Define schema?
                    var db = new SQLDatabase({name: databaseName, conn}, this.schema[databaseName]);
                    if ((schema || []).length) {
                        databaseCreateSchema({name: databaseName, conn}, schema, onExists).then(() => {
                            resolve(db);
                        });
                    } else {
                        resolve(db);
                    }
                });
            });
        });
    }

    /**
     * Drops a database.
     * 
     * @param String databaseName
     * 
     * @return Bool
     */
    static async _drop(databaseName) {
        var conn = await this.getConnection();
        return new Promise((resolve, reject) => {
            conn.query('DROP DATABASE IF EXISTS ' + databaseName, err => {
                if (err) return reject(err);
                resolve(true);
            });
        });
    }
};