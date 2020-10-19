
/**
 * @imports
 */
import _promise from '@onephrase/util/js/promise.js';
import _arrFrom from '@onephrase/util/arr/from.js';
import IDBCursor from './IDBCursor.js';
import Cursor from './Cursor.js';
import Table from './Table.js';

/**
 * ---------------------------
 * Table class
 * ---------------------------
 */				

export default class IDBTable extends Table {
	 
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
	async getStore(mode = 'readwrite') {
		var DB = await this.DB;
		var transaction = DB.transaction([this.storeName], mode);
		// We can worry not about onerror, onabort, oncomplete
		return transaction.objectStore(this.storeName);	
	}

	/**
	 * Returns a cursor.
	 * 
	 * @return Cursor
	 */
	async getCursor(progressive = false) {
		var store = await this.getStore('readonly');
		if (progressive) {
			return new IDBCursor(store);
		}
		var getAllRequest = store.getAll();
		var rows = await _promise(resolve => {
			getAllRequest.onsuccess = e => {
				resolve(_arrFrom(e.target.result))
			};
		});
		return new Cursor(rows);
	}

	/**
	 * @inheritdoc
	 */
	async append(rowObj, onduplicateCallback = null) {
		var store = await this.getStore();
		return await _promise((resolve, reject) => {
			var addRequest = store.add(rowObj);
			addRequest.onsuccess = e => resolve(e.target.result);
			addRequest.onerror = async e => {
				var _rowObj = {...rowObj};
				if (e.target.error.name === 'ConstraintError' && onduplicateCallback && onduplicateCallback(_rowObj)) {
					// We must getStore() in another transaction
					var store = await this.getStore();
					var putRequest = store.put(_rowObj);
					putRequest.onsuccess = e => resolve(e.target.result);
					putRequest.onerror = e => reject(e.target.error);
				} else {
					reject(e.target.error);
				}
			};
		});
	}
};