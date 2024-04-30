
import Node from '../Node.js';

export default class Prim extends Node {

	/**
	 * Instance properties
	 */
	VALUE;

	/**
	 * @constructor
	 */
	constructor(context, value) {
		super(context);
		this.VALUE = value;
	}

	/**
	 * Sets the value to true
	 */
	true() { this.VALUE = true; }

	/**
	 * Sets the value to false
	 */
	false() { this.VALUE = false; }

	/**
	 * Sets the value to null
	 */
	null() { this.VALUE = null; }
	
	/**
	 * @inheritdoc
	 */
	stringify() { return `${ this.VALUE }`; }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		if (!/^(TRUE|FALSE|NULL)$/i.test(expr)) return;
		return new this(context, JSON.parse(expr));
	}
}