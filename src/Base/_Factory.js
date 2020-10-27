
/**
 * @imports
 */
import _isArray from '@onephrase/util/js/isArray.js';
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
        if (Object.keys(schema || {}).length) {
            if (_isObject(schema)) {
                _each(schema, (name, _schema) => {
                    // Replace
                    _schema.name = name;
                });
                schema = Object.values(schema);
            }
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
    
    /**
     * ---------
     * IMPORT/EXPORT
     * ---------
     */

    /**
     * Drops a database.
     * 
     * @param String databaseName
     * @param Object payload
     * @param Bool replace
     * 
     * @return Array
     */
    static async import(databaseName, payload, replace = false) {
        var database = await this.create(databaseName, payload.schema, replace);
        return Promise.all(Object.keys(payload.data || {}).map(async storeName => {
            var store = await database.open(storeName, 'readwrite');
            return store.addAll(payload.data[storeName]);
        }));
    }

    /**
     * Drops a database.
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