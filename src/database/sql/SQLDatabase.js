

/**
 * @imports
 */
import _isNull from '@webqit/util/js/isNull.js';
import _isString from '@webqit/util/js/isString.js';
import _isNumeric from '@webqit/util/js/isNumeric.js';
import _intersect from '@webqit/util/arr/intersect.js';
import _arrFrom from '@webqit/util/arr/from.js';
import _each from '@webqit/util/obj/each.js';
import _Database from '../_Database.js';
import SQLStore from './SQLStore.js';

/**
 * ---------------------------
 * SQLDatabase class
 * ---------------------------
 */				

export default class SQLDatabase extends _Database {
	
    /**
     * Returns store names.
     * 
     * @return void
     */
    async list() {
        return new Promise((resolve, reject) => {
            this.database.conn.query('SHOW TABLES FROM ' + this.database.name, (err, result) => {
                if (err) return reject(err);
                resolve(result.map(row => row['Tables_in_' + this.database.name]));
            });
        });
    }
	 
	/**
	 * Opens a store.
     * 
     * @param String  storeName
     * @param String  mode
     * @param Object params
     * 
     * @return SQLStore
	 */
	open(storeName, mode = 'readonly', params = {}) {
        params.mode = mode;
		return new SQLStore(
            {name: storeName, database: this.database},
            storeName,
            this.schema[storeName],
            params
        );
	}

    /**
     * Creates a store
     * 
     * @param String  storeName
     * @param Object schema
     * @param String  onExists
     * 
     * @return SQLStore
     */
    async _create(storeName, schema, onExists = null) {
        var _schema = {...schema};
        _schema.name = storeName;
        await databaseCreateSchema(this.database, [schema], onExists);
        return this.open(storeName, 'readwrite');
    }

    /**
     * Drops a store.
     * 
     * @param String  storeName
     * 
     * @return Bool
     */
    _drop(storeName) {
        return new Promise((resolve, reject) => {
            this.database.conn.query('DROP TABLE IF EXISTS ' + storeName, err => {
                if (err) return reject(err);
                resolve(true);
            });
        });
    }
}

/**
 * ---------
 * HELPERS
 * ---------
 */

/**
 * Helps create Object Stores
 * 
 * @param Object conn 
 * @param SQLDatabase database 
 * @param Array schema 
 * @param String onExists
 * 
 * @return void
 */
export const databaseCreateSchema = (database, schema, onExists) => {
    return Promise.all(schema.map(async storeSchema => {
        if (!storeSchema.driver) {
            storeSchema.driver = 'SQL';
        }
        // Create store...
        var storeExistence = await queryTableColumns(database.conn, storeSchema.name);
        if (!storeExistence.length) {
            storeExistence = null;
        }
        if (storeExistence && !onExists) {
            throw new Error('Table "' + storeSchema.name + '" already exists!');
        }
        if (onExists === 'drop') {
            await (new Promise((resolve, reject) => {
                database.conn.query('DROP TABLE IF EXISTS ' + storeSchema.name, err => {
                    if (err) return reject(err);
                    storeExistence = false;
                    resolve();
                });
            }));
        }
        // Moving on to create or alter 
        // ---------------------------
        var sqlStmt = {},
            foreignKeys = [],
            jsonColumns = [];
        // Primary Key
		// ---------------------------
		if (!(storeExistence || []).includes(storeSchema.primaryKey)) {
			sqlStmt[storeSchema.primaryKey] = (storeExistence ? 'ADD COLUMN ' : '') + '`' + storeSchema.primaryKey + '` int AUTO_INCREMENT NOT NULL PRIMARY KEY';
		}
        // Columns
		// ---------------------------
        var fieldsLoop, prevIteration;
        await Promise.all(Object.keys(storeSchema.fields).map(name => {
            prevIteration/* block next iteration */ = new Promise(async resolve => {
                var prevColumn = await prevIteration;/* wait prev iteration */

                var field = storeSchema.fields[name];
                if (field.referencedEntity) {
                    // Resolve dependency
                    if (field.referencedEntity.table !== storeSchema.name && !(await tableExists(database.conn, field.referencedEntity.table))) {
                        // Simply ignore?
                        var referencedEntitySchema = schema.filter(_schema => _schema.name === field.referencedEntity.table)[0];
                        if (referencedEntitySchema && (await databaseCreateSchema(database, referencedEntitySchema, replace))[0]) {
                            // Add to foreign keys list
                            foreignKeys[name] = field.referencedEntity;
                        }
                    } else if (!(await isLinkedForeignKey(database.conn, storeSchema.name, name))) {
                        // Add to foreign keys list
                        foreignKeys[name] = field.referencedEntity;
                    }
                }

                if ((storeExistence || []).includes(name) || name === storeSchema.primaryKey) {
                    // End it here for this field
                    return resolve(name);
                }

                if ((field.type || '').toLowerCase() === 'json') {
                    jsonColumns.push(name);
                }

                var columnBlueprintStr = '`' + name + '` ' + (field.type || 'varchar(255)') + (field.charlen ? ' (' + field.charlen + ')' : '') + (field.nullable === false ? ' NOT NULL' : '');
                if ('default' in field) {
                    columnBlueprintStr += ' DEFAULT ' + (!_isNull(field.default) ? (field.default === 'CURRENT_TIMESTAMP' ? field.default : '"' + field.default + '"') : 'NULL');
                }

                if (field.onupdate === 'CURRENT_TIMESTAMP') {
                    columnBlueprintStr += ' ON UPDATE CURRENT_TIMESTAMP';
                }

                sqlStmt[name] = (storeExistence ? 'ADD COLUMN ' : '') + columnBlueprintStr + (storeExistence && prevColumn ? ' AFTER ' + prevColumn : '');
                resolve(name);
                
            });

            // Into the map
            return prevIteration;
        }));
        
		// Was terminated?
		if (fieldsLoop === false) {
			return;
        }

        // Fulltext Columns
		// ---------------------------
		if (storeSchema.fulltextColumns && _intersect(storeSchema.fulltextColumns, (storeExistence || [])).length) {
			sqlStmt['FULLTEXT'] = (storeExistence ? 'ADD ' : '') + 'FULLTEXT (`' + storeSchema.fulltextColumns.join('`, `') + '`)';
        }
        // Unique Keys
		// ---------------------------
		if (storeSchema.uniqueKeys) {
            var i = 0;
			_each(storeSchema.uniqueKeys, (alias, keyPath) => {
                var addedKeys = _intersect(_arrFrom(keyPath), Object.keys(sqlStmt));
				if (addedKeys.length) {
					if (!_isNumeric(alias)) {
						sqlStmt[(i ++) + 'unique'] = (storeExistence ? 'ADD ' : '') + 'CONSTRAINT `' + alias + '` UNIQUE KEY (`' + _arrFrom(keyPath).join('`, `') + '`)';
					} else if (_isString(keyPath)) {
						sqlStmt[(i ++) + 'unique'] = (storeExistence ? 'ADD ' : '') + 'UNIQUE KEY (`' + keyPath + '`)';
					}
				}
			});
        }
        // JSON Columns checks
		// ---------------------------
		jsonColumns.forEach((name, i) => {
			sqlStmt[i + 'json'] = (storeExistence ? 'ADD ' : '') + 'CHECK(JSON_VALID(' + name + '))';
        });
        // Foreign Keys
		// ---------------------------
		_each(foreignKeys, (name, referenceBlueprint) => {
			var referenceBlueprintStr = (storeExistence ? 'ADD ' : '') + 'CONSTRAINT FOREIGN KEY (`' + name + '`) REFERENCES ' + prefixedTableName(referenceBlueprint.table) + ' (`' + referenceBlueprint.column + '`)';
			if (referenceBlueprint.onupdate) {
				referenceBlueprintStr += ' ON UPDATE ' + referenceBlueprint.onupdate.replace(/_/g, ' ');
            }
            if (referenceBlueprint.ondelete) {
				referenceBlueprintStr += ' ON DELETE ' + referenceBlueprint.ondelete.replace(/_/g, ' ');
			}
			sqlStmt['foreignKeys'] = referenceBlueprintStr;
        });
        
        // -------------------

		if (!sqlStmt) {
			if (storeExistence) {
				return 2;
			}
			return 0;
        }

        var sql;
        if (storeExistence) {
			// ALTER Table
			// ---------------------------
			sql = 'ALTER TABLE `' + storeSchema.name + '`';
			// Blueprint
			// ---------------------------
			sql += "\r\n\t" + Object.values(sqlStmt).join(",\r\n\t") + "\r\n";
		} else {
			// CREATE Table and opening bracket
			// ---------------------------
			sql = 'CREATE TABLE `' + storeSchema.name + '`(';
			// Blueprint
			// ---------------------------
			sql += "\r\n\t" + Object.values(sqlStmt).join(",\r\n\t") + "\r\n";
			// Closing bracket and engine
			// ---------------------------
			sql += ') ENGINE=' + (storeSchema.engine || 'InnoDB') + ';';
        }
        
        // -------------------

        return await (new Promise((resolve, reject) => {
            database.conn.query(sql, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        }));

    }));
};

/**
 * Checks table existence.
 * 
 * @param Object conn 
 * @param String tableName 
 * 
 * @return Promise -> Number
 */
export const tableExists = async (conn, tableName) => {
    return (await queryTableColumns(conn, tableName) || []).length > 0;
};

/**
 * Checks foreign key existence.
 * 
 * @param Object conn 
 * @param String tableName 
 * @param String keyName 
 * 
 * @return Promise -> Number
 */
export const isLinkedForeignKey = (conn, tableName, keyName) => {
    return new Promise(resolve => {
        var isLinkedSql = 'SELECT REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM INFORMATION_SCHEMA.`KEY_COLUMN_USAGE` WHERE REFERENCED_TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?';
        conn.query(isLinkedSql, [tableName, keyName], (err, result) => {
            if (err) return resolve(0);
            resolve(result.length);
        });
    });
};

/**
 * Queries table columns.
 * 
 * @param Object conn 
 * @param String tableName 
 * 
 * @return Promise -> Array
 */
export const queryTableColumns = (conn, tableName) => {
    return new Promise(resolve => {
        var columnsQuerySql = 'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?';
        conn.query(columnsQuerySql, [tableName], (err, result) => {
            if (err) return resolve([]);
            resolve(result.reduce((columns, row) => columns.concat(row['COLUMN_NAME']), []));
        });
    });
};