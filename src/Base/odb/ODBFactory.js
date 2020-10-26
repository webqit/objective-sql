

/**
 * @imports
 */
import _Factory from '../_Factory.js';
import ODBDatabase from './ODBDatabase.js';

/**
 * ---------------------------
 * ODBFactory class
 * ---------------------------
 */				

export default class ODBFactory extends _Factory {

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
     * @param Bool  replace
     * 
     * @return Bool
     */
    static async _create(databaseName, schema, replace = false) {
        this.databases[databaseName] = {};
        if ((schema || []).length) {
            schema.forEach(_schema => {
                this.databases[databaseName][_schema.name] = [];
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
};

/**
 * Databases storage.
 * 
 * @var Object
 */
ODBFactory.databases = {};
