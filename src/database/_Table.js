
/**
 * @imports
 */
import _isTypeObject from '@webqit/util/js/isTypeObject.js';
import _isObject from '@webqit/util/js/isObject.js';
import _isEmpty from '@webqit/util/js/isEmpty.js';
import _isNull from '@webqit/util/js/isNull.js';
import _isString from '@webqit/util/js/isString.js';
import _isNumeric from '@webqit/util/js/isNumeric.js';
import _isUndefined from '@webqit/util/js/isUndefined.js';
import _arrFrom from '@webqit/util/arr/from.js';
import _intersect from '@webqit/util/arr/intersect.js';
import _all from '@webqit/util/arr/all.js';
import _each from '@webqit/util/obj/each.js';
import _wrapped from '@webqit/util/str/wrapped.js';

/**
 * ---------------------------
 * Table class
 * ---------------------------
 */				

export default class _Table {
	 
	/**
	 * @inheritdoc
	 */
	constructor(database, tableName, def, params = {}) {
		// -----------------
		this.database = database;
		this.name = tableName;
		this.def = def;
		this.params = params;
		// -----------------
		if (_isEmpty(def.schema)) {
			def.schema = {
				primaryKey: '',
				columns: {},
				indexes: {},
				derived: true,
			};
		}
	}

	/**
	 * ----------
	 * SCHEMA UTILS
	 * ----------
	 */

	/**
	 * Get Primary Key columns from schema.
	 * 
	 * @returns Array
	 */
	getKeyPathForPrimaryKey() {
		var keyPath = Object.keys(this.def.schema.columns).filter(name => this.def.schema.columns[name].primaryKey);
		if (!keyPath.length && this.def.schema.primaryKey) {
			keyPath = _arrFrom(this.def.schema.primaryKey);
		}
		return keyPath;
	}

	/**
	 * Get Index columns from schema.
	 * 
	 * @param String type
	 * 
	 * @returns Array
	 */
	 getKeyPathsForIndex(type) {
		var keyPaths = Object.keys(this.def.schema.columns).filter(name => this.def.schema.columns[name][type]);
		if (this.def.schema.indexes) {
			Object.keys(this.def.schema.indexes).filter(indexName => this.def.schema.indexes[indexName].type === type).forEach(indexName => {
				keyPaths.push(_arrFrom(this.def.schema.indexes[indexName].keyPath));
			});
		}
		return keyPaths;
	}

	/**
	 * ----------
	 * QUERY UTILS
	 * ----------
	 */

	/**
	 * Syncs a cursor.
	 * 
	 * @param Cursor cursor
	 * 
	 * @return Number
	 */
	async syncCursor(cursor) {
		return await this.putAll(cursor.cache);
	}

	/**
	 * @inheritdoc
	 */
	async match(rowObj) {
		// -----------
		var primaryKey, existing;
		if (this.def.schema.primaryKey 
		&& (primaryKey = readKeyPath(rowObj, this.def.schema.primaryKey)) 
		&& (existing = await this.get(primaryKey))) {
			return {
				matchingKey: 'PRIMARY_KEY',
				primaryKey,
				row: existing,
			};
		}
		// -----------
		var match, uniqueKeys = Object.keys(this.def.schema.indexes).filter(alias => this.def.schema.indexes[alias].type === 'unique');
		if (uniqueKeys.length) {
			(await this.getAll()).forEach((existingRow, i) => {
				if (match) {
					return;
				}
				uniqueKeys.forEach(constraintName => {
					var keyPath = this.def.schema.indexes[constraintName].keyPath;
					if (existingRow && readKeyPath(rowObj, keyPath) === readKeyPath(existingRow, keyPath)) {
						match = {
							matchingKey: constraintName,
							primaryKey: this.def.schema.primaryKey ? readKeyPath(existingRow, this.def.schema.primaryKey) : i,
							row: {...existingRow},
						};
					}
				});
			});
		}

		return match;
	}
	
	/**
	 * -------------------------------
	 */

	/**
	 * @inheritdoc
	 */
	async addAll(multiValues, columns = [], duplicateKeyCallback = null, forceAutoIncrement = false) {

		var ongoingAdd;
		var forUpdates = [];

		var inserts = await Promise.all(multiValues.map(async (values, line) => {


			var rowObj = {};
			if (_isObject(values)) {
				rowObj = values;
			} else {
				var _columns = columns.length ? columns : Object.keys(this.def.schema.columns);
				if (_columns.length && _columns.length !== values.length) {
					throw new Error('Column/values count mismatch at line ' + line + '!');
				}
				_columns.forEach((columnName, i) => {
					rowObj[columnName] = values[i];
				});
			}

			// -------------
			this.handleInput(rowObj, true);					
			// -------------

			if (this.shouldMatchInput(rowObj) || duplicateKeyCallback) {
				ongoingAdd/* block next iteration */ = new Promise(async resolve => {
					await ongoingAdd;/* wait prev iteration */

					var match = await this.match(rowObj);
					if (match && duplicateKeyCallback) {
						var duplicateRow = {...match.row};
						if (duplicateKeyCallback(duplicateRow, rowObj)) {
							forUpdates.push(duplicateRow);
						}
						// The duplicate situation had been handled
						// ...positive or negative
						return resolve('0');
					}

					// We're finally going to add!
					// We must not do this earlier...
					// as "onupdate" rows will erronously take on a new timestamp on this column
					await this.beforeAdd(rowObj, match);
					resolve(this.add(rowObj));
				});

				return ongoingAdd;
			}

			await this.beforeAdd(rowObj);
			return this.add(rowObj);
		}));

		// OnDuplicateKey updates
		if (forUpdates.length) {
			inserts = inserts.concat(await this.putAll(forUpdates));
		}

		return inserts.filter((n, i) => n !== 0 && inserts.indexOf(n) === i);
	}
		
	/**
	 * @inheritdoc
	 */
	async beforeAdd(rowObj, match) {
		var timestamp = (new Date).toISOString();
		_each(this.def.schema.columns || {}, (name, field) => {
			if ((field.type === 'datetime' || field.type === 'timestamp') && field.default === 'CURRENT_TIMESTAMP') {
				rowObj[name] = timestamp;
			}
		});
	}
	 
	/**
	 * @inheritdoc
	 */
	async putAll(multiRows) {
		var ongoingPut;
		var updates = await Promise.all(multiRows.map(async rowObj => {

			// -------------
			this.handleInput(rowObj);					
			// -------------
			if (this.shouldMatchInput(rowObj)) {
				ongoingPut/* block next iteration */ = new Promise(async resolve => {
					await ongoingPut;/* wait prev iteration */

					await this.beforePut(rowObj, await this.match(rowObj));
					resolve(this.put(rowObj));

				});

				return ongoingPut;
			}

			await this.beforePut(rowObj);
			return this.put(rowObj);
		}));

		return updates;
	}
		
	/**
	 * @inheritdoc
	 */
	async beforePut(rowObj, match) {
		if (match && !_all(Object.keys(rowObj), key => rowObj[key] === match.row[key])) {
			var timestamp = (new Date).toISOString();
			_each(this.def.schema.columns || {}, (name, field) => {
				if ((field.type === 'datetime' || field.type === 'timestamp') && field.onupdate === 'CURRENT_TIMESTAMP') {
					rowObj[name] = timestamp;
				}
			});
		}
	}
	 
	/**
	 * @inheritdoc
	 */
	async deleteAll(multiIDs) {
		var deletes = await Promise.all(multiIDs.map(async primaryKey => {
			return this.delete(await this.beforeDelete(primaryKey));
		}));

		return deletes;
	}
		
	/**
	 * @inheritdoc
	 */
	async beforeDelete(primaryKey) {	
		return primaryKey;
	}
	
	/**
	 * -------------------------------
	 */

	/**
	 * @inheritdoc
	 */
	handleInput(rowObj, applyDefaults = false) {
		var rowObjColumns = Object.keys(rowObj);
		var schemaColumns = Object.keys(this.def.schema.columns);
		// ------------------
		var unknownFields = rowObjColumns.filter(col => schemaColumns.indexOf(col) === -1);
		if (unknownFields.length) {
			throw new Error('Unknown column: ' + unknownFields[0]);
		}
		// ------------------
		schemaColumns.forEach(columnName => {
			var value = rowObj[columnName];
			var field = _isObject(this.def.schema.columns[columnName]) ? this.def.schema.columns[columnName] : {};
			if (rowObjColumns.includes(columnName)) {
				// TODO: Validate supplied value
				if (field.type === 'json') {
					if (!_isTypeObject(_value) && (!_isString(value) || (!_wrapped(value, '[', ']') && !_wrapped(value, '{', '}')))) {
					}
				} else if (['char', 'tinytext', 'smalltext', 'text', 'bigtext', 'varchar'].includes(field.type)) {
					if (!_isString(value)) {
					}
				} else if (['bit', 'tinyint', 'smallint', 'int', 'bigint', 'decimal', 'number', 'float', 'real'].includes(field.type)) {
					if (!_isNumeric(value)) {
					}
				} else if (['enum', 'set'].includes(field.type)) {
					if (!_isNumeric(value)) {
					}
				} else if (['date', 'datetime', 'timestamp'].includes(field.type)) {
					if (!_isString(value)) {
					}
				}
			} else if (applyDefaults && !_intersect(_arrFrom(columnName), _arrFrom(this.def.schema.primaryKey)).length) {
				// DONE: Apply defaults...
				rowObj[columnName] = ('default' in field) && !(['date', 'datetime', 'timestamp'].includes(field.type) && field.default === 'CURRENT_TIMESTAMP') 
					? field.default 
					: null;
			}
			// Non-nullable
			if (field.nullable === false && (_isNull(rowObj[columnName]) || _isUndefined(rowObj[columnName]))) {
				throw new Error('Inserting NULL on non-nullable column: ' + columnName);
			}
		});
	}
		
	/**
	 * @inheritdoc
	 */
	shouldMatchInput(rowObj) {
		return Object.keys(this.def.schema.columns).filter(name => {
			var field = this.def.schema.columns[name];
			return ['datetime', 'timestamp'].includes(field.type) 
				&& (field.default === 'CURRENT_TIMESTAMP' || field.onupdate === 'CURRENT_TIMESTAMP')
		}).length;
	}
}

/**
 * @AutoIncremen
 */
const readKeyPath = (rowObj, keyPath) => {
	return _arrFrom(keyPath).map(key => rowObj[key]).filter(v => v).join('-');
};
