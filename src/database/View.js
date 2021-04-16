
/**
 * @imports
 */
import _Cursor from './_Cursor.js';
import _Store from './_Store.js';

/**
 * ---------------------------
 * View class
 * ---------------------------
 */				

export default class View extends _Store {
	 
	/**
	 * @inheritdoc
	 */
	constructor(stmt, store, name, schema = {}, params = {}) {
		super(store, name, schema, params);
		this.stmt = stmt;
	}

	/**
	 * Returns a cursor.
	 * 
	 * @return Cursor
	 */
	getCursor() {
		return new _Cursor((this.store || []).filter(row => row));
	}

	/**
	 * Syncs cursors at the base.
	 * 
	 * @param Cursor cursor
	 * 
	 * @return Number
	 */
	async syncCursor(cursor) {
		return this.stmt.base.syncCursors();
	}
}