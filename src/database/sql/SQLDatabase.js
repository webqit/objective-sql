

/**
 * @imports
 */
import _isFunction from '@webqit/util/js/isFunction.js';
import _isObject from '@webqit/util/js/isObject.js';
import _isNull from '@webqit/util/js/isNull.js';
import _arrFrom from '@webqit/util/arr/from.js';
import _each from '@webqit/util/obj/each.js';
import _Database from '../_Database.js';
import SQLTable from './SQLTable.js';

/**
 * ---------------------------
 * SQLDatabase class
 * ---------------------------
 */				

export default class SQLDatabase extends _Database {
	
    /**
     * @inheritdoc
     */
    async tables() {
        var conn = await this.driver.getConnection();
        return new Promise((resolve, reject) => {
            conn.query(`SHOW TABLES FROM ${this.name}`, (err, result) => {
                if (err) return reject(err);
                resolve(result.map(row => row['Tables_in_' + this.name]));
            });
        });
    }

    /**
     * @inheritdoc
     */
    async table(tableName, params = {}) {
        return new SQLTable(this, tableName, {
            schema: await this.getTableSchema(tableName),
        }, params);
    }

    /**
     * CREATE/ALTER/DROP
     */

    /**
     * @inheritdoc
     */
    async createTable(tableName, tableSchema, params = {}) {
        
        var sqlStmt = [], actions = this.diffSchema({}, tableSchema);
        _each(actions, (changeName, changeDef) => {
            if (changeName === 'primaryKey') {
                if (changeDef.add) {
                    sqlStmt.push(this.toSql[changeName](changeDef.add, changeDef.add));
                }
            } else {
                _each(changeDef.add, (prop, def) => {
                    sqlStmt.push(this.toSql[changeName](prop, def));
                });
            }
        });
        
        var sql = `CREATE TABLE ${params.ifNotExists ? 'IF NOT EXISTS ' : ''}\`${tableName}\` (`;
        sql += "\r\n\t" + Object.values(sqlStmt).join(",\r\n\t") + "\r\n";
        sql += ') ENGINE=' + (tableSchema.engine || 'InnoDB') + ';';
        
        var conn = await this.driver.getConnection();
        return await (new Promise((resolve, reject) => {
            conn.query(sql, (err, result) => {
                if (err) return reject(err);
                this.def.schema[tableName] = tableSchema;
                resolve(new SQLTable(this, tableName, {
                    schema: tableSchema,
                }));
            });
        }));

    }

    /**
     * @inheritdoc
     */
    async alterTable(tableName, newTableSchemaOrCallback, params = {}) {

        var tableSchema = await this.getTableSchema(tableName),
            newTableSchema;
        if (_isFunction(newTableSchemaOrCallback)) {
            // Modify existing schema
            newTableSchema = this.cloneSchema(tableSchema);
            await newTableSchemaOrCallback(newTableSchema);
        } else if (_isObject(callback)) {
            newTableSchema = newTableSchemaOrCallback;
        } else {
            throw new Error('Table/store modification expects only an object (new schema) or a function (callback that recieves existing schema).')
        }

        var sqlStmt = [], actions = this.diffSchema({}, newTableSchema);
        _each(actions, (changeName, changeDef) => {
            if (changeName !== 'renamedColumns') {
                // "primaryKey", "columns", "foreignKeys", "indexes", "jsonColumns"
                if (changeName === 'primaryKey') {
                    if (changeDef.add) {
                        sqlStmt.push(this.toSql[changeName](changeDef.add, changeDef.add, 'add'));
                    } else if (changeDef.alter) {
                        sqlStmt.push(this.toSql[changeName](changeDef.alter, changeDef.alter, 'alter'));
                    } else if (changeDef.drop) {
                        sqlStmt.push(this.toSql[changeName](changeDef.drop, changeDef.drop, 'drop'));
                    }
                } else {
                    _each(changeDef.add, (prop, def) => {
                        sqlStmt.push(this.toSql[changeName](prop, def, 'add'));
                    });
                    _each(changeDef.alter, (prop, changes) => {
                        sqlStmt.push(this.toSql[changeName](prop, changes.current, 'alter'));
                    });
                    _each(changeDef.drop, (prop, oldDef) => {
                        sqlStmt.push(this.toSql[changeName](prop, oldDef, 'drop'));
                    });
                }
            } else {
                // "renamedColumns" actually comes last from source...
                // and really should
                _each(changeDef, (oldName, newName) => {
                    sqlStmt.push(this.toSql[changeName](oldName, newName));
                });
            }
        });

        var sql = `ALTER TABLE ${params.ifExists ? 'IF EXISTS ' : ''}\`${tableName}\` (`;
        sql += "\r\n\t" + Object.values(sqlStmt).join(",\r\n\t") + "\r\n";
        sql += ');';
        
        var conn = await this.driver.getConnection();
        return await (new Promise((resolve, reject) => {
            conn.query(sql, (err, result) => {
                if (err) return reject(err);
                this.def.schema[tableName] = newTableSchema;
                resolve(new SQLTable(this, tableName, {
                    schema: newTableSchema,
                }));
            });
        }));

    }

    /**
     * @inheritdoc
     */
    async dropTable(tableName, params = {}) {
        var sql = `DROP TABLE ${params.ifExists ? 'IF EXISTS ' : ''}\`${tableName}\``;
        
        var conn = await this.driver.getConnection();
        return await (new Promise((resolve, reject) => {
            conn.query(sql, (err, result) => {
                if (err) return reject(err);
                delete this.def.schema[tableName];
                resolve(result);
            });
        }));
    }

    /**
     * @inheritdoc
     */
    async getTableSchema(tableName) {
        return this.def.schema[tableName];
    }

    // ----------------

    /**
     * @var Object.
     * 
     * SQL translators.
     */
    toSql = {

        primaryKey: (columnName, def, delta) => {
            if (delta === 'drop') {
                return 'DROP PRIMARY KEY';
            }
            // Compose STRING
            var columnSql = 'PRIMARY KEY (`' + _arrFrom(def).join('`, `') + '`)';
            if (delta) {
                return (delta === 'alter' ? 'DROP PRIMARY KEY, ADD ' : 'ADD ') + columnSql;
            }
            return columnSql;
        },
    
        columns: (columnName, def, delta) => {
            if (delta === 'drop') {
                return 'DROP COLUMN `' + columnName + '`';
            }
            // Compose STRING
            var columnSql = '`' + columnName + '` ' + (def.type ? def.type + (def.charlen ? ' (' + def.charlen + ')' : '') : (def.referencedEntity ? 'int' : 'varchar(255)')) + (def.nullable === false ? ' NOT NULL' : '') + (def.primaryKey ? ' PRIMARY KEY' : '') + (def.autoIncrement ? ' AUTO_INCREMENT' : '');
            if ('default' in def) {
                columnSql += ' DEFAULT ' + (!_isNull(def.default) ? (def.default === 'CURRENT_TIMESTAMP' ? def.default : '"' + def.default + '"') : 'NULL');
            }
            if (def.onupdate === 'CURRENT_TIMESTAMP') {
                columnSql += ' ON UPDATE CURRENT_TIMESTAMP';
            }
            if (delta) {
                return (delta === 'alter' ? 'ALTER COLUMN ' : 'ADD COLUMN ') + columnSql + (def.before ? ' BEFORE ' + def.before : (def.after ? ' AFTER ' + def.after : ''));
            }
            return columnSql;
        },
    
        foreignKeys: (columnName, def, delta) => {
            if (delta === 'drop') {
                return 'DROP CONSTRAINT `' + columnName + '`';
            }
            var columnSql = 'CONSTRAINT FOREIGN KEY (`' + columnName + '`) REFERENCES ' + def.table + ' (`' + (def.column) + '`)';
            if (def.onupdate) {
                columnSql += ' ON UPDATE ' + def.onupdate.replace(/_/g, ' ');
            }
            if (def.ondelete) {
                columnSql += ' ON DELETE ' + def.ondelete.replace(/_/g, ' ');
            }
            if (delta) {
                return (delta === 'alter' ? 'ALTER ' : 'ADD ') + columnSql;
            }
            return columnSql;
        },
    
        indexes: (alias, def, delta) => {
            if (delta === 'drop') {
                return 'DROP CONSTRAINT `' + alias + '`';
            }
            var columnSql;
            if (def.type === 'fulltext' || def.type === 'unique') {
                columnSql = (def.type === 'fulltext' ? 'FULLTEXT' : 'UNIQUE KEY') + ' `' + alias + '` (`' + _arrFrom(def.keyPath).join('`, `') + '`)';
            } else {
                columnSql = 'INDEX `' + alias + '` (`' + _arrFrom(def.keyPath).join('`, `') + '`)';
            }
            if (delta) {
                return (delta === 'alter' ? 'ALTER ' : 'ADD ') + columnSql;
            }
            return columnSql;
        },
    
        jsonColumns: (alias, columnName, delta) => {
            if (delta === 'drop') {
                return 'DROP CONSTRAINT `' + alias + '`';
            }
            var columnSql = 'CONSTRAINT `' + alias + ' CHECK(JSON_VALID(' + columnName + '))';
            if (delta) {
                return (delta === 'alter' ? 'ALTER ' : 'ADD ') + columnSql;
            }
            return columnSql;
        },
    
        renamedColumns: (columnName, newColumnName) => {
            return 'ALTER COLUMN `' + columnName + '` RENAME TO `' + newColumnName + '`';
        },
    
    }

}