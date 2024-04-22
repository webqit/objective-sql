
import Node from '../Node.js';

export default class Identifier extends Node {
	
	/**
	 * Instance properties
	 */
	BASENAME;
	NAME;

	/**
	 * @constructor
	 */
	constructor(context, ...args) {
		super(context);
		this.NAME = args.pop(); // First
		this.BASENAME = args.pop();
	}

	/**
	 * Sets the name.
	 * 
	 * @param String name
	 * 
	 * @returns this
	 */
	name(name) {
		this.NAME = name;
		return this;
	}

	/**
	 * Sets the basename.
	 * 
	 * @param String basename
	 * 
	 * @returns this
	 */
	basename(basename) {
		this.BASENAME = basename;
		return this;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() {
		return [
			this.BASENAME && !/^\w+$/.test(this.BASENAME) ? `"${ this.BASENAME }"` : this.BASENAME,
			!/^\w+$/.test(this.NAME) ? `"${ this.NAME }"` : this.NAME
		].filter(s => s).join('.') + (this.FLAGS.length ? ` ${ this.FLAGS.map(s => s.replace(/_/g, ' ')).join(' ') }` : '');
	}
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		if (/^[\w.]+$/.test(expr)) return new this(context, ...expr.split('.').map(s => s.trim()));
	}
}