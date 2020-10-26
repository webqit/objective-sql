
/**
 * @imports
 */
import _isObject from '@onephrase/util/js/isObject.js';
import _arrFrom from '@onephrase/util/arr/from.js';
import _each from '@onephrase/util/obj/each.js';
import { schemaCreateStores } from './_Database.js';

/**
 * --------------------------
 * Programmatic API for database management.
 * --------------------------
 * .list()
 * .exists()
 * .open()
 * .create()
 * .drop()
 */
export default class _Factory {

    /**
     * Has a database?
     * 
     * @param String databaseName
     * 
     * @return Bool
     */
    static async exists(databaseName = this.defaultDB) {
        var databases = await this.list();
        return databases.filter(database => database.name === databaseName).length > 0;
    }

    /**
     * Drops a database.
     * 
     * @param String databaseName
     * @param Array  tables
     * @param Bool  replace
     * 
     * @return Object
     */
    static async create(databaseName = this.defaultDB, schema = [], replace = false) {
        var currentDatabases = await this.list();
        var existingVersions = _arrFrom(currentDatabases).filter(d => d.name === databaseName).map(d => d.version);
        if (existingVersions.length) {
            if (!replace) {
                throw new Error('Database "' + databaseName + '" already exists at versions: ' + existingVersions.join(',') + '!');
            }
            await this.drop(databaseName);
        }
        // ------------------
        this.schema[databaseName] = {};
        if ((schema || []).length) {
            schemaCreateStores(this.schema[databaseName], schema);
        }
        // ------------------
        return await this._create(databaseName, schema, replace);
    }

    /**
     * Drops a database.
     * 
     * @param String databaseName
     * 
     * @return Bool
     */
    static async drop(databaseName = this.defaultDB) {
        if (!(await this.exists(databaseName))) {
            throw new Error('Database "' + databaseName + '" has not been defined.');
        }
        // ------------------
        delete this.schema[databaseName];
        // ------------------
        return await this._drop(databaseName);;
    }
};

/**
 * Databases definitions.
 * 
 * @var Object
 */
_Factory.schema = {};

/**
 * Default Database name.
 * 
 * @var String
 */
_Factory.defaultDB = 'default';
