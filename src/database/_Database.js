

/**
 * @imports
 */
import _isObject from '@onephrase/util/js/isObject.js';
import _arrFrom from '@onephrase/util/arr/from.js';
import _each from '@onephrase/util/obj/each.js';

/**
 * ---------------------------
 * _Database class
 * ---------------------------
 */				

export default class _Database {
	
	/**
	 * @constructor
	 */
	constructor(database, schema = {}) {
		this.database = database;
		this.schema = schema;
		// --------------
		this.name = database.name;
	}

    /**
     * Store existence.
     * 
     * @param String storeName
     * 
     * @return Bool
     */
    async has(storeName) {
        var stores = await this.list();
        return stores.includes(storeName);
    }
	
    /**
     * Creates a store.
     * 
     * @param String storeName
     * @param Object schema
     * @param String onExists
     * 
     * @return _Store
     */
    async create(storeName, schema, onExists = null) {
        if (await this.has(storeName)) {
            if (!onExists) {
                throw new Error('Table "' + storeName + '" already exists.');
            }
            if (onExists === 'drop') {
                await this.drop(storeName);
            }
		}
		schema.name = storeName;
        // ------------------
        schemaCreateStores(this.schema, [schema], onExists);
        // ------------------
        return await this._create(storeName, schema, onExists);
    }

    /**
     * Drops a store.
     * 
     * @param String storeName
     * 
     * @return Bool
     */
    async drop(storeName) {
        if (!(await this.has(storeName))) {
            throw new Error('Table "' + storeName + '" has not been defined.');
        }
        // ------------------
        delete this.schema[storeName];
        // ------------------
        return await this._drop(storeName);
    }
};

/**
 * ---------
 * HELPERS
 * ---------
 */

/**
 * Helps create Object Stores
 * 
 * @param Object base 
 * @param Array schema 
 * @param String onExists
 * 
 * @return void
 */
export const schemaCreateStores = (base, schema, onExists) => {
    return schema.map(_schema => {
        validateTableSchema(_schema);
        if (base[_schema.name]) {
            if (!onExists) {
                throw new Error('Store name "' + _schema.name + '" already exists!');
            }
        }
        if (!base[_schema.name] || onExists === 'drop') {
            base[_schema.name] = _schema;
        }
    });
};

/**
 * Helps validate a Table schema definition.
 * 
 * @param Object table 
 * 
 * @return void
 */
const validateTableSchema = (table) => {
    if (!_isObject(table)) {
        throw new Error('Table definition must be an object.');
    }
    if (!table.name) {
        throw new Error('Table must have a name.');
    }
    if (table.autoIncrement) {
        if (!table.primaryKey) {
            throw new Error('The Auto-Increment directive cannot be used without a Primary Key.');
        }
        if (_arrFrom(table.primaryKey).length > 1) {
            throw new Error('The Auto-Increment directive cannot be used with a composite Primary Key.');
        }
    }
    if (!_isObject(table.fields)) {
        throw new Error('Table must have a valid "fields" list.');
    }
    _each(table.fields, (fieldName, field) => {
        if (!_isObject(field)) {
            throw new Error('Invalid field definition: "' + fieldName + '" at "' + table.name + '".');
        }
        if (field.referencedEntity
            && !(_isObject(field.referencedEntity) && field.referencedEntity.name)) {
            throw new Error('Invalid foreign key definition: "' + fieldName + '" at "' + table.name + '".');
        }
    });
};
