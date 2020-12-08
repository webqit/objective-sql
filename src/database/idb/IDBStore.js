
/**
 * @imports
 */
import _isArray from '@webqit/util/js/isArray.js';
import _isNumeric from '@webqit/util/js/isNumeric.js';
import _arrFrom from '@webqit/util/arr/from.js';
import DuplicateKeyViolationError from '../DuplicateKeyViolationError.js';
import _Store from '../_Store.js';
import IDBCursor from './IDBCursor.js';
import IDBProgressiveCursor from './IDBProgressiveCursor.js';

/**
 * ---------------------------
 * IDBStore class
 * ---------------------------
 */				

export default class IDBStore extends _Store {

	/**
	 * Returns a cursor.
	 * 
	 * @return IDBCursor
	 */
	getCursor() {
		return new IDBCursor(this.store());
	}

	/**
	 * Returns a cursor.
	 * 
	 * @return IDBProgressiveCursor
	 */
	getProgressiveCursor() {
		return new IDBProgressiveCursor(this.store());
	}
	 
	/**
	 * @inheritdoc
	 */
	getAll() {
		return new Promise(async (resolve, reject) => {
			var getAllRequest = (this.tx_store || this.store('readonly')).getAll();
			getAllRequest.onsuccess = e => resolve(_arrFrom(e.target.result));
			getAllRequest.onerror = e => reject(e.target.error);
		});
	}
	 
	/**
	 * @inheritdoc
	 */
	get(primaryKey) {
		return new Promise(async (resolve, reject) => {
			// Now this is very important
			primaryKey = _isNumeric(primaryKey) ? parseInt(primaryKey) : primaryKey;
			var getRequest = (this.tx_store || this.store('readonly')).get(primaryKey);
			getRequest.onsuccess = e => resolve(e.target.result);
			getRequest.onerror = e => reject(e.target.error);
		});
	}
	
	/**
	 * @inheritdoc
	 */
	count(...query) {
		return new Promise(async (resolve, reject) => {
			var countRequest = this.store().count(...query);
			countRequest.onsuccess = e => resolve(e.target.result);
			countRequest.onerror = e => reject(e.target.error);
		});
	}
	
	/**
	 * @inheritdoc
	 */
	addAll(multiValues, columns = [], duplicateKeyCallback = null) {
		this.tx_store = this.store();
		return super.addAll(...arguments);
	}

	/**
	 * @inheritdoc
	 */
	add(rowObj) {
		return new Promise(async (resolve, reject) => {
			var addRequest = (this.tx_store || this.store()).add(rowObj);
			addRequest.onsuccess = e => resolve(e.target.result);
			addRequest.onerror = e => {
				var error = e.target.error;
				if (error.name === 'ConstraintError') {
					reject(new DuplicateKeyViolationError(error.message));
				} else {
					reject(error);
				}
			};
		});
	}
	
	/**
	 * @inheritdoc
	 */
	putAll(rowObj) {
		this.tx_store = this.store();
		return super.putAll(...arguments);
	}

	/**
	 * @inheritdoc
	 */
	put(rowObj) {
		return new Promise(async (resolve, reject) => {
			var putRequest = (this.tx_store || this.store()).put(rowObj);
			putRequest.onsuccess = e => resolve(e.target.result);
			putRequest.onerror = e => reject(e.target.error);
		});
	}
	
	/**
	 * @inheritdoc
	 */
	deleteAll(primaryKey) {
		this.tx_store = this.store();
		return super.deleteAll(...arguments);
	}

	/**
	 * @inheritdoc
	 */
	delete(primaryKey) {
		if (_isArray(primaryKey)) {
			if (primaryKey.length > 1) {
				throw new Error('IDB does not support Composite Primary Keys');
			}
			primaryKey = primaryKey[0];
		}
		// Now this is very important
		primaryKey = _isNumeric(primaryKey) ? parseInt(primaryKey) : primaryKey;
		return new Promise(async (resolve, reject) => {
			var delRequest = (this.tx_store || this.store()).delete(primaryKey);
			delRequest.onsuccess = e => resolve(primaryKey);
			delRequest.onerror = e => reject(e.target.error);
		});
	}
};