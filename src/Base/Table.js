
/**
 * @imports
 */
import _isObject from '@onephrase/util/js/isObject.js';
import _isArray from '@onephrase/util/js/isArray.js';
import _arrFrom from '@onephrase/util/arr/from.js';
import _intersect from '@onephrase/util/arr/intersect.js';
import _merge from '@onephrase/util/obj/merge.js';
import _each from '@onephrase/util/obj/each.js';
import FetchInterface from './FetchInterface.js';
import Cursor from './Cursor.js';

/**
 * ---------------------------
 * Table class
 * ---------------------------
 */				

export default class Table extends FetchInterface {
	 
	/**
	 * @inheritdoc
	 */
	constructor(DB, storeName, alias, schema) {
		super();
		this.DB = DB;
		this.storeName = storeName;
		this.alias = alias;
		this.schema = schema;
	}
	 
	/**
	 * @inheritdoc
	 */
	async getStore() {
		var DB = await this.DB;
		return DB[this.storeName];
	}

	/**
	 * Returns a cursor.
	 * 
	 * @return Cursor
	 */
	async getCursor() {
		var store = await this.getStore();
		return new Cursor(store.filter(row => row));
	}
	 
	/**
	 * @inheritdoc
	 */
	insert(multiValues, columns = [], duplicateKeyCallback = null) {
		return Promise.all(multiValues.map((values, line) => {
			if (columns.length && columns.length !== values.length) {
				throw new Error('Column/values count mismatch at line ' + line + '!');
			}
			var rowObj = {};
			if (this.schema.fields) {
				var schemaColumns = Object.keys(this.schema.fields);
				if (columns.length) {
					var unknownFields = columns.filter(col => schemaColumns.indexOf(col) === -1);
					if (unknownFields.length) {
						throw new Error('Unknown column: ' + unknownFields[0]);
					}
				} else {
					columns = schemaColumns;
				}
				schemaColumns.forEach(schemaColumnName => {
					// Unspecified column? Then default value...
					var keyColumnPosition = columns.indexOf(schemaColumnName);
					if (keyColumnPosition === -1) {
						if (!_intersect(_arrFrom(schemaColumnName), _arrFrom(this.schema.primaryKey)).length) {
							rowObj[schemaColumnName] = this.schema.fields && _isObject(this.schema.fields[schemaColumnName]) 
								? this.schema.fields[schemaColumnName].default 
								: null;
						}
					} else {
						// Specified column! Specified value!
						rowObj[schemaColumnName] = values[keyColumnPosition];
					}
				});
			} else {
				columns.forEach((columnName, i) => {
					rowObj[columnName] = values[i];
				});
			}
			return this.append(rowObj, duplicateKeyCallback);
		}));
	}

	/**
	 * @inheritdoc
	 */
	async append(rowObj, onduplicateCallback = null) {
		var store = await this.store, uniqueConstraints = {}, successCode = 0;
		// -----------
		var primaryKeyPath = this.schema.primaryKey,
			primaryKeyAutoIncrement = this.schema.autoIncrement;
		if ((!_isArray(primaryKeyPath) || (primaryKeyPath.length === 1 && (primaryKeyPath = primaryKeyPath[0]))) && primaryKeyAutoIncrement !== false) {
			rowObj[primaryKeyPath] = store.length;
		}
		// -----------
		if (this.schema.primaryKey) {
			uniqueConstraints['primary_key'] = primaryKeyPath;
		}
		if (this.schema.uniqueKeys) {
			uniqueConstraints = _merge(uniqueConstraints, this.schema.uniqueKeys);
		}
		// -----------
		if (Object.keys(uniqueConstraints).length) {
			store.forEach(existingRow => {
				var constraintViolation;
				_each(uniqueConstraints, (constraintName, keyPath) => {
					if (!constraintViolation && _arrFrom(keyPath).reduce((prev, columnName) => prev && rowObj[columnName] === existingRow[columnName], true)) {
						if (onduplicateCallback) {
							constraintViolation = constraintName;
						}
					}
				});
				if (constraintViolation) {
					var _rowObj = {...rowObj};
					if (onduplicateCallback && onduplicateCallback(_rowObj)) {
						successCode += 2;
						_merge(existingRow, _rowObj);
					} else {
						throw new Error('Inserting duplicate values on unique key constraint: ' + constraintViolation);
					}
				}
			});
		}
		// -----------
		if (!successCode) {
			store.push(rowObj);
			successCode = 1;
		}
		return successCode;
	}
};