
/**
 * @imports
 */
import _Cursor from './_Cursor.js';
import _Table from './_Table.js';

/**
 * ---------------------------
 * View class
 * ---------------------------
 */				

export default class View extends _Table {
	 
	/**
	 * @inheritdoc
	 */
	constructor(stmt, database, tableName, def, params = {}) {
		super(database, tableName, def, params);
		this.stmt = stmt;
	}

	/**
	 * Returns a cursor.
	 * 
	 * @return Cursor
	 */
	getCursor() {
		return new _Cursor((this.def.data || []).filter(row => row));
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