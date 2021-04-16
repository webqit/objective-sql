
/**
 * @imports
 */
import _arrFrom from '@webqit/util/arr/from.js';
import _merge from '@webqit/util/obj/merge.js';
import _each from '@webqit/util/obj/each.js';
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
		return new ODBCursor(
			// IMPORTANT: Deep copy... that is... copy each row
			(this.store || []).reduce((_store, row) => _store.concat(row ? {...row} : undefined), []).filter(row => row)
		);
	}
	 
	/**
	 * @inheritdoc
	 */
	async getAll() {
		// IMPORTANT: Deep copy... that is... copy each row
		return (this.store || []).reduce((_store, row) => _store.concat(row ? {...row} : undefined), []);
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
		return store[rowID] ? {...store[rowID]} : undefined;
	}
		 
	/**
	 * @inheritdoc
	 */
	async count() {
		var store = this.store;
		return store.length;
	}

	/**
	 * @inheritdoc
	 */
	shouldMatchInput(rowObj) {
		return this.schema.primaryKey || super.shouldMatchInput(rowObj);
	}

	/**
	 * @inheritdoc
	 */
	async beforeAdd(rowObj, match) {
		if (match) {
			throw new DuplicateKeyViolationError('Inserting duplicate values on unique key constraint: ' + match.matchingKey);
		} else {
			var store = this.store;
			processPrimaryKey(store, rowObj, this.schema.primaryKey, this.schema.autoIncrement);
		}

		await super.beforeAdd(rowObj, match);
	}

	/**
	 * @inheritdoc
	 */
	add(rowObj) {
		this.ongoingWrite = new Promise(async (resolve, reject) => {
			try { await this.ongoingWrite; } catch(e) {}
			var store = this.store;
			var primaryKey = readKeyPath(rowObj, this.schema.primaryKey);
			if (this.schema.autoIncrement) {
				store[primaryKey - 1] = rowObj;
			} else {
				store[primaryKey] = rowObj;
			}
			resolve(primaryKey);
		});

		return this.ongoingWrite;
	}
		
	/**
	 * @inheritdoc
	 */
	async beforePut(rowObj, match) {
		if (match) {
			_each(match.row, (key, value) => {
				if (!(key in rowObj)) {
					rowObj[key] = value;
				}
			});
		} else {
			var store = this.store;
			processPrimaryKey(store, rowObj, this.schema.primaryKey, this.schema.autoIncrement);
		}

		await super.beforePut(rowObj, match);
	}
	 
	/**
	 * @inheritdoc
	 */
	put(rowObj) {
		this.ongoingWrite = new Promise(async resolve => {
			try { await this.ongoingWrite; } catch(e) {}
			var store = this.store,
				primaryKey = readKeyPath(rowObj, this.schema.primaryKey);
			if (this.schema.autoIncrement) {
				store[primaryKey - 1] = rowObj;
			} else {
				store[primaryKey] = rowObj;
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
			if (this.schema.autoIncrement) {
				if (store[rowID - 1]) {
					delete store[rowID - 1];
					primaryKey = rowID;
				}
			} else {
				if (store[rowID]) {
					delete store[rowID];
					primaryKey = rowID;
				}
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

}

/**
 * @AutoIncremen
 */
var readKeyPath = (rowObj, keyPath) => {
	return _arrFrom(keyPath).map(key => rowObj[key]).filter(v => v).join('-');
};

/**
 * @AutoIncremen
 */
export function processPrimaryKey(store, rowObj, primaryKey, canAutoIncrement) {
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
}