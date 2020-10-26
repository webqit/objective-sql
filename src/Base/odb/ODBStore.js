
/**
 * @imports
 */
import _arrFrom from '@onephrase/util/arr/from.js';
import _merge from '@onephrase/util/obj/merge.js';
import DuplicateKeyViolationError from '../DuplicateKeyViolationError.js';
import _Store from '../_Store.js';
import ODBCursor from './ODBCursor.js';

/**
 * ---------------------------
 * ODBStore class
 * ---------------------------
 */				

export default class ODBStore extends _Store {
	 
	/**
	 * @inheritdoc
	 */
	constructor(store, name, schema = {}, params = {}) {
		super(...arguments);
		this.ongoingWrite = null;
	}

	/**
	 * Returns a cursor.
	 * 
	 * @return Cursor
	 */
	getCursor() {
		return new ODBCursor((this.store || []).filter(row => row));
	}
	 
	/**
	 * @inheritdoc
	 */
	async getAll() {
		return this.store;
	}
	 
	/**
	 * @inheritdoc
	 */
	async get(rowID) {
		if (!this.schema.primaryKey) {
			throw new Error('Table must define a Primary Key to fetch an item by Primary Key.');
		}
		var store = this.store;
		rowID = _arrFrom(rowID).join('-');
		if (this.schema.autoIncrement) {
			return store[rowID - 1] ? {...store[rowID - 1]} : undefined;
		}
		var result, primaryKey;
		store.forEach((rowObj, i) => {
			if (!result && (primaryKey = readKeyPath(rowObj, this.schema.primaryKey)) === rowID) {
				result = {...rowObj};
			}
		});

		return result;
	}

	/**
	 * @inheritdoc
	 */
	add(rowObj, ignoreValidate = false) {
		this.ongoingWrite = new Promise(async (resolve, reject) => {
			try { await this.ongoingWrite; } catch(e) {}
			var duplicate, store = this.store;
			if (!ignoreValidate && (duplicate = await this.match(rowObj))) {
				return reject(new DuplicateKeyViolationError('Inserting duplicate values on unique key constraint: ' + duplicate.matchingKey));
			}
			var _rowObj = {...rowObj};
			var primaryKey = processPrimaryKey(store, _rowObj, this.schema.primaryKey, this.schema.autoIncrement)
			store.push(_rowObj);
			resolve(primaryKey);
		});

		return this.ongoingWrite;
	}
	 
	/**
	 * @inheritdoc
	 */
	put(rowObj) {
		this.ongoingWrite = new Promise(async resolve => {
			try { await this.ongoingWrite; } catch(e) {}
			var primaryKey, match, store = this.store;
			if (match = await this.match(rowObj)) {
				primaryKey = match.primaryKey;
				var updatedRowObj = _merge(match.row, rowObj);
				if (this.schema.autoIncrement) {
					store[primaryKey - 1] = updatedRowObj;
				} else {
					store.forEach((rowObj, i) => {
						if (readKeyPath(rowObj, this.schema.primaryKey) === primaryKey) {
							store[i] = updatedRowObj;
						}
					});
				}
			} else {
				var _rowObj = {...rowObj};
				primaryKey = processPrimaryKey(store, _rowObj, this.schema.primaryKey, this.schema.autoIncrement)
				store.push(_rowObj);
			}
			resolve(primaryKey);
		});

		return this.ongoingWrite;
	}
	 
	/**
	 * @inheritdoc
	 */
	delete(rowID, assertExisting = true) {
		this.ongoingWrite = new Promise(async (resolve, reject) => {
			try { await this.ongoingWrite; } catch(e) {}
			var primaryKey, store = this.store;
			if (this.schema.autoIncrement && store[rowID - 1]) {
				delete store[rowID - 1];
				primaryKey = rowID;
			} else {
				store.forEach((rowObj, i) => {
					if (!primaryKey && (primaryKey = readKeyPath(rowObj, this.schema.primaryKey)) === rowID) {
						delete store[i];
					}
				});
			}
			if (!primaryKey && assertExisting) {
				return reject(new Error('The given row (with ' + _arrFrom(this.schema.primaryKey).join(',') + ' = ' + primaryKey + ') does not exist in the store.'));
			}
			resolve(primaryKey);
		});

		return this.ongoingWrite;
	}
		 
	/**
	 * @inheritdoc
	 */
	async clear() {
		var store = this.store;
		store.splice(0);
		return true;
	}

};

/**
 * @AutoIncremen
 */
var readKeyPath = (rowObj, keyPath) => {
	return _arrFrom(keyPath).map(key => rowObj[key]).filter(v => v).join('-');
};

/**
 * @AutoIncremen
 */
var processPrimaryKey = (store, rowObj, primaryKey, canAutoIncrement) => {
	if (!primaryKey) {
		return;
	}
	var primaryKeyVal = readKeyPath(rowObj, primaryKey);
	if (!primaryKeyVal && canAutoIncrement) {
		var primaryKeyPath = _arrFrom(primaryKey);
		if (primaryKeyPath.length > 1) {
			throw new Error('The Auto-Increment flag cannot be used with Composite Primary Keys.');
		}
		primaryKeyVal = store.length + 1;
		rowObj[primaryKeyPath[0]] = primaryKeyVal;
	}
	return primaryKeyVal;
};