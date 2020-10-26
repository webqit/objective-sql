
/**
 * @imports
 */
import _isObject from '@onephrase/util/js/isObject.js';
import _isEmpty from '@onephrase/util/js/isEmpty.js';
import _arrFrom from '@onephrase/util/arr/from.js';
import _intersect from '@onephrase/util/arr/intersect.js';
import _each from '@onephrase/util/obj/each.js';

/**
 * ---------------------------
 * Store class
 * ---------------------------
 */				

export default class _Store {
	 
	/**
	 * @inheritdoc
	 */
	constructor(store, name, schema = {}, params = {}) {
		// -----------------
		this.store = store;
		this.name = name;
		this.schema = !_isEmpty(schema) ? schema : {
			name: store.name,
			primaryKey: '',
			fields: {},
			uniqueKeys: {},
		};
		this.params = params;
		// -----------------
	}

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
		if (this.schema.primaryKey 
		&& (primaryKey = readKeyPath(rowObj, this.schema.primaryKey)) 
		&& (existing = await this.get(primaryKey))) {
			return {
				matchingKey: 'PRIMARY_KEY',
				primaryKey,
				row: existing,
			};
		}
		// -----------
		var match;
		if (this.schema.uniqueKeys) {
			(await this.getAll()).forEach((existingRow, i) => {
				if (match) {
					return;
				}
				_each(this.schema.uniqueKeys, (constraintName, keyPath) => {
					if (existingRow)
					if (existingRow && readKeyPath(rowObj, keyPath) === readKeyPath(existingRow, keyPath)) {
						match = {
							matchingKey: constraintName,
							primaryKey: this.schema.primaryKey ? readKeyPath(existingRow, this.schema.primaryKey) : i,
							row: {...existingRow},
						};
					}
				});
			});
		}

		return match;
	}

	/**
	 * @inheritdoc
	 */
	async addAll(multiValues, columns = [], duplicateKeyCallback = null) {

		var forUpdates = [];
		var ongoingAdd;

		var inserts = await Promise.all(multiValues.map(async (values, line) => {

			// -------------
			var _columns = columns, _values = values;
			if (_isObject(values)) {
				_columns = Object.keys(values);
				_values = Object.values(values);
			}
			// -------------

			if (_columns.length && _columns.length !== _values.length) {
				throw new Error('Column/values count mismatch at line ' + line + '!');
			}

			var rowObj = {};
			if (this.schema.fields) {
				var schemaColumns = Object.keys(this.schema.fields);
				if (_columns.length) {
					var unknownFields = _columns.filter(col => schemaColumns.indexOf(col) === -1);
					if (unknownFields.length) {
						throw new Error('Unknown column: ' + unknownFields[0]);
					}
				} else {
					_columns = schemaColumns;
				}
				schemaColumns.forEach(schemaColumnName => {
					// Unspecified column? Then default value...
					var keyColumnPosition = _columns.indexOf(schemaColumnName);
					if (keyColumnPosition === -1) {
						if (!_intersect(_arrFrom(schemaColumnName), _arrFrom(this.schema.primaryKey)).length) {
							rowObj[schemaColumnName] = this.schema.fields && _isObject(this.schema.fields[schemaColumnName]) 
								? this.schema.fields[schemaColumnName].default 
								: null;
						}
					} else {
						// Specified column! Specified value!
						rowObj[schemaColumnName] = _values[keyColumnPosition];
					}
				});
			} else {
				_columns.forEach((columnName, i) => {
					rowObj[columnName] = _values[i];
				});
			}

			if (duplicateKeyCallback) {
				ongoingAdd = new Promise(async resolve => {
					await ongoingAdd;

					var duplicate;
					if (duplicate = await this.match(rowObj)) {
						var duplicateRow = {...duplicate.row};
						if (duplicateKeyCallback(duplicateRow)) {
							forUpdates.push(duplicateRow);
							return resolve(0);
						}
					}

					resolve(this.add(rowObj, false));
				});

				return ongoingAdd;
			}

			return await this.add(rowObj);
		}));

		// OnDuplicateKey updates
		if (forUpdates.length) {
			inserts = inserts.concat(await this.putAll(forUpdates));
		}

		return inserts;
	}
	 
	/**
	 * @inheritdoc
	 */
	async putAll(multiRows) {
		var updates = await Promise.all(multiRows.map(rowObj => {
			return this.put(rowObj);
		}));

		return updates;
	}
	 
	/**
	 * @inheritdoc
	 */
	async deleteAll(multiIDs) {
		var deletes = await Promise.all(multiIDs.map(rowID => {
			return this.delete(rowID);
		}));

		return deletes;
	}
};

/**
 * @AutoIncremen
 */
var readKeyPath = (rowObj, keyPath) => {
	return _arrFrom(keyPath).map(key => rowObj[key]).filter(v => v).join('-');
};
