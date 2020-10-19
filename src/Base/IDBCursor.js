

/**
 * ---------------------------
 * Cursor class
 * ---------------------------
 */				

export default class IDBCursor {
	 
	/**
	 * @inheritdoc
	 */
	constructor(store) {
		this._store = store;
		this._rows = [];
		this.key = 0;
		this._onfinish = [];
		this.flags = {};
	}
	 
	/**
	 * @inheritdoc
	 */
	onfinish(callback) {this._onfinish.push(callback);}
	 
	/**
	 * @inheritdoc
	 */
	next() {
		if (!this._eof) {
			if (!this._cursorRequest) {
				throw new Error('fetch() must be called before calling next()');
			}
			this.key ++;
		} else {
			if (!this._rows.length || this.key === this._rows.length - 1) {
				this._onfinish.forEach(callback => callback());
				this.key = 0;
				return;
			}
			this.key ++;
		}
	}
		 
	/**
	 * @inheritdoc
	 */
	eof() {
		// The store must reach eof before we can be correct with this._rows.length
		return this._eof && (!this._rows.length || this.key === this._rows.length - 1);
	}
	 
	/**
	 * @inheritdoc
	 */
	fetch() {
		return new Promise(resolve => {
			// After having filled this._rows from store
			if (this._eof || this.key < this._rows.length) {
				resolve(this._rows[this.key]);
			} else {
				if (!this._countRequest) {
					// First time reading from store
					this._countRequest = this._store.count();
					this._countRequest.onsuccess = e => {
						this._count = e.target.result;
						this._cursorRequest = this._store.openCursor();
						this._handleCursorFetch(resolve);
						this._continueCursor = () => this._cursor.continue();
					};
				} else {
					this._handleCursorFetch(resolve);
					this._continueCursor();
				}
			}
		});
	}

	/**
	 * Helps handle cursor result
	 * 
	 * @param Function resolve
	 * 
	 * @return void
	 */
	_handleCursorFetch(resolve) {
		this._cursorRequest.onsuccess = e => {
			this._cursor = e.target.result;
			if (this._cursor) {
				var value = this._cursor.value;
				this._rows.push(value);
				if (this._rows.length === this._count) {
					this._eof = true;
				}
				resolve(value);
			} else {
				this._eof = true;
				resolve();
			}
			console.log(this._store.name, this._rows.length, this._count);
		}
	}
};
