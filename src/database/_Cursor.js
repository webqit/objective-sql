

/**
 * ---------------------------
 * _Cursor class
 * ---------------------------
 */				

export default class _Cursor {
	 
	/**
	 * @inheritdoc
	 */
	constructor(rows) {
		this.cache = rows;
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
		if (!this.cache.length || this.key === this.cache.length - 1) {
			this.__eof = true;
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
		return !this.cache.length || this.key === this.cache.length - 1;
	}
	 
	/**
	 * @inheritdoc
	 */
	async fetch() {
		if (this.key < this.cache.length) {
			return this.cache[this.key];
		}
	}
}