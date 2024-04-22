
import Node from "../Node.js";

export default class Num extends Node {
	
	/**
	 * Instance properties
	 */
	VALUE = 0;

	/**
	 * @constructor
	 */
	constructor(context, value) {
		super(context);
		this.VALUE = value;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() { return `${ this.VALUE }`; }
	
	/**
	 * @inheritdoc
	 */
	static parse(context, expr) {
		if (/^\d+$/.test(expr)) return new this(context, parseFloat(expr));
	}
}