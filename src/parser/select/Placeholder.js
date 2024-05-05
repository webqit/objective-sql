
import { _isNumeric } from '@webqit/util/js/index.js';
import Node from '../Node.js';
		
export default class Placeholder extends Node {

	/**
	 * Instance properties
	 */
	OFFSET;
	NOTATION;

	/**
	 * @constructor
	 */
	constructor(context, offset, notation) {
		super(context);
		this.OFFSET = parseInt(offset);
		this.NOTATION = notation;
	}

	/**
	 * @inheritdoc
	 */
	toJson() { return { offset: this.OFFSET, notation: this.NOTATION, }; }

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json) {
		if (typeof json?.offset === 'undefined' || typeof json.notation !== 'string') return;
		return new this(context, json.offset, json.notation);
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() { return this.NOTATION === '?' ? '?' : this.NOTATION + this.OFFSET; }
	
	/**
	 * @inheritdoc
	 */
	static parse(context, expr) {
		if (expr.startsWith('?') || expr.startsWith(':')) {
			return new this(context, expr.substr(1), expr.substr(0, 1));
		}
	}
}
