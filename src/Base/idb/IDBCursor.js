
/**
 * @imports
 */
import _arrFrom from '@onephrase/util/arr/from.js';
import _Cursor from '../_Cursor.js';


/**
 * ---------------------------
 * IDBCursor class
 * ---------------------------
 */				

export default class IDBCursor extends _Cursor {
	 
	/**
	 * @inheritdoc
	 */
	constructor(store) {
		super([]);
		// ---------------
		this._store = store;
		// ---------------
		this._storeFetch = new Promise(async resolve => {
			var store = await this._store;
			var getAllRequest = store.getAll();
			getAllRequest.onsuccess = e => {
				this.cache = _arrFrom(e.target.result);
				resolve();
			};
		});
	}
	 
	/**
	 * @inheritdoc
	 */
	async fetch() {
		await this._storeFetch;
		return super.fetch();
	}
};