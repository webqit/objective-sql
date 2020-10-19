

/**
 * ---------------------------
 * Cursor class
 * ---------------------------
 */				

export default class Cursor {
	 
	/**
	 * @inheritdoc
	 */
	constructor(rows) {
		this._rows = rows;
		this.key = 0;
		this.flags = {};
		this._onfinish = [];
	}
	 
	/**
	 * @inheritdoc
	 */
	onfinish(callback) {this._onfinish.push(callback);}
	 
	/**
	 * @inheritdoc
	 */
	next() {
		if (!this._rows.length || this.key === this._rows.length - 1) {
			this._onfinish.forEach(callback => callback());
			this.key = 0;
			return;
		}
        this.key ++;
	}
		 
	/**
	 * @inheritdoc
	 */
	eof() {
		return !this._rows.length || this.key === this._rows.length - 1;
	}
	 
	/**
	 * @inheritdoc
	 */
	async fetch() {
		if (this.key < this._rows.length) {
			return this._rows[this.key];
		}
	}
};