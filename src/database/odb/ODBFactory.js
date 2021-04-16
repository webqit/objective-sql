

/**
 * @imports
 */
import _Factory from '../_Factory.js';
import ODBDatabase from './ODBDatabase.js';
import ObjSQL from '../../index.js';

/**
 * ---------------------------
 * ODBFactory class
 * ---------------------------
 */				

export default class ODBFactory extends _Factory {

    /**
     * ---------
     * QUERY
     * ---------
     */
	 
	/**
     * @inheritdoc
	 */
	static async _query(query, params = {}) {
        params.DB_FACTORY = this;
        return ObjSQL.parse(query, null, params).eval(this);
    }
    
    /**
     * ---------
     * API
     * ---------
     */
	 
	/**
     * Returns a list of database definitions.
     * 
     * @return Array
	 */
	static async list() {
        return Object.keys(this.databases).map(d => { return {name: d, version: 0}; });
	}
	 
	/**
	 * Opens a database.
	 * 
	 * @inheritdoc
	 */
	static async open(databaseName = this.defaultDB, version = 0) {
		return new ODBDatabase(this.databases[databaseName], this.schema[databaseName]);
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
     * @param String  onExist
     * 
     * @return Bool
     */
    static async _create(databaseName, schema, onExist = null) {
        if (!this.databases[databaseName]) {
            this.databases[databaseName] = {};
        }
        if ((schema || []).length) {
            schema.forEach(_schema => {
                if (!this.databases[databaseName][_schema.name]) {
                    this.databases[databaseName][_schema.name] = [];
                }
            });
        }
        return new ODBDatabase(this.databases[databaseName], this.schema[databaseName]);
    }

    /**
     * Drops a database.
     * 
     * @param String databaseName
     * 
     * @return Bool
     */
    static async _drop(databaseName) {
        delete this.databases[databaseName];
        return true;
    }
}

/**
 * Databases storage.
 * 
 * @var Object
 */
ODBFactory.databases = {};
