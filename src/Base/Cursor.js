

/**
 * ---------------------------
 * Cursor class
 * ---------------------------
 */				

export default class Cursor extends Array {
	 
	/**
	 * @inheritdoc
	 */
	constructor(...args) {
		super(...args);
		this._onfinish = [];
		this.cursor = 0;
	}
	 
	/**
	 * @inheritdoc
	 */
	onfinish(callback) {this._onfinish.push(callback);}
	 
	/**
	 * @inheritdoc
	 */
	advance() {
		if (this.cursor === this.length - 1) {
			this._onfinish.forEach(callback => callback());
			return;
		}
        this.cursor ++;
	}
	 
	/**
	 * @inheritdoc
	 */
	fetch() {
		if (this.cursor < this.length) {
			return this[this.cursor];
		}
	}
};