
import { _isNumeric } from '@webqit/util/js/index.js';
import Node from '../Node.js';
		
export default class Placeholder extends Node {

	/**
	 * Instance properties
	 */
	ID;
	NOTATION;

	/**
	 * @constructor
	 */
	constructor(context, id, notation) {
		super(context);
		this.ID = _isNumeric(id) ? parseInt(id) : id;
		this.NOTATION = notation;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() { return this.NOTATION === '?' ? '?' : this.NOTATION + this.ID; }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		if (expr.startsWith('?') || expr.startsWith(':')) {
			return new this(context, expr.substr(1), expr.substr(0, 1));
		}
	}
}
