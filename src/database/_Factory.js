
/**
 * @imports
 */
import _isArray from '@webqit/util/js/isArray.js';
import _isObject from '@webqit/util/js/isObject.js';
import _arrFrom from '@webqit/util/arr/from.js';
import _each from '@webqit/util/obj/each.js';
import { schemaCreateStores } from './_Database.js';

/**
 * --------------------------
 * Programmatic API for database management.
 * --------------------------
 * .list()
 * .has()
 * .open()
 * .create()
 * .drop()
 */
export default class _Factory {

    /**
     * ---------
     * QUERY
     * ---------
     */
	 
	/**
     * Parses and evaluates a query.
     * 
     * @param String query
     * @param Array ...args
     * 
     * @return Any
	 */
	static async query(query, ...args) {
        // -----------------
        var params, vars;
        if (_isArray(args[0])) {
            vars = args.shift();
        }
        params = args.shift() || {};
        if (vars) {
            params.vars = vars;
        }
        // -----------------
        return this._query(query, params);
    }

    /**
     * Has a database?
     * 
     * @param String databaseName
     * 
     * @return Bool
     */
    static async has(databaseName = this.defaultDB) {
        var databases = await this.list();
        return databases.filter(database => database.name === databaseName).length > 0;
    }

    /**
     * Creates a database.
     * 
     * @param String databaseName
     * @param Array  tables
     * @param String  onExist
     * 
     * @return Object
     */
    static async create(databaseName = this.defaultDB, schema = [], onExist = null) {
        var currentDatabases = await this.list();
        var existingVersions = _arrFrom(currentDatabases).filter(d => d.name === databaseName).map(d => d.version);
        if (existingVersions.length) {
            if (!onExist) {
                throw new Error('Database "' + databaseName + '" already exists at versions: ' + existingVersions.join(',') + '!');
            } else if (onExist === 'drop') {
                await this.drop(databaseName);
            }
        }
        // ------------------
        if (!this.schema[databaseName] || onExist === 'drop') {
            this.schema[databaseName] = {};
        }
        if (Object.keys(schema || {}).length) {
            if (_isObject(schema)) {
                _each(schema, (name, _schema) => {
                    // Replace
                    _schema.name = name;
                });
                schema = Object.values(schema);
            }
            schemaCreateStores(this.schema[databaseName], schema, onExist);
        }
        // ------------------
        return await this._create(databaseName, schema, onExist);
    }

    /**
     * Drops a database.
     * 
     * @param String databaseName
     * 
     * @return Bool
     */
    static async drop(databaseName = this.defaultDB) {
        if (!(await this.has(databaseName))) {
            throw new Error('Database "' + databaseName + '" has not been defined.');
        }
        // ------------------
        delete this.schema[databaseName];
        // ------------------
        return await this._drop(databaseName);
    }
    
    /**
     * ---------
     * IMPORT/EXPORT
     * ---------
     */

    /**
     * Imports into a database.
     * 
     * @param String databaseName
     * @param Object payload
     * @param String onExists
     * 
     * @return Array
     */
    static async import(databaseName, payload, onExists = null) {
        var database = await this.create(databaseName, payload.schema, onExists);
        return Promise.all(Object.keys(payload.data || {}).map(async storeName => {
            var store = await database.open(storeName, 'readwrite');
            return store.addAll(payload.data[storeName]);
        }));
    }

    /**
     * Exports from a database.
     * 
     * @param String databaseName
     * @param Array ...args
     * 
     * @return Object
     */
    static async export(databaseName, ...args) {
        var database = await this.open(databaseName, ...args);
        // -------------------
        var _export = {schema: database.schema, data: {}};
        // -------------------
        var storeNames = await database.list();
        await Promise.all(storeNames.map(async name => {
            var store = await database.open(name);
            _export.data[name] = await store.getAll();
        }));
        return _export;
    }
}

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
_Factory.defaultDB = 'db1';

/**
 * DB Schema
 */
export const factoryGetSchema = (DB_FACTORY = null, databaseName = null) => {
    //DB_FACTORY = DB_FACTORY || _Factory;
    if (DB_FACTORY && (DB_FACTORY.prototype instanceof _Factory || DB_FACTORY === _Factory)) {
        return DB_FACTORY.schema[databaseName || DB_FACTORY.defaultDB];
    }
    if (!databaseName && DB_FACTORY) {
        return DB_FACTORY;
    }
};