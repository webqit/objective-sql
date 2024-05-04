
import Node from '../abstracts/Node.js';

export default class Identifier extends Node {
	
	/**
	 * Instance properties
	 */
	BASENAME;
	NAME;

	/**
	 * @constructor
	 */
	constructor(context, name, basename = null) {
		super(context);
		this.NAME = name;
		this.BASENAME = basename;
	}

	/**
	 * Sets the name.
	 * 
	 * @param String name
	 * 
	 * @returns this
	 */
	name(name) { this.NAME = name; return this; }

	/**
	 * Sets the basename.
	 * 
	 * @param String basename
	 * 
	 * @returns this
	 */
	basename(basename) { this.BASENAME = basename; return this; }

	/**
	 * @inheritdoc
	 */
	toJson() { return { name: this.NAME, basename: this.BASENAME, flags: this.FLAGS, }; }

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json) {
		if (typeof json === 'string') json = { name: json };
		else if (typeof json?.name !== 'string') return;
		return (new this(context, json.name, json.basename)).withFlag(...(json?.flags || []));
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() {
		return this.autoEsc([this.BASENAME, this.NAME].filter(s => s)).join('.') + (
			this.FLAGS.length ? ` ${ this.FLAGS.map(s => s.replace(/_/g, ' ')).join(' ') }` : ''
		);
	}
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		const [name, basename] = this.parseIdent(context, expr) || [];
		if (!name) return;
		return new this(context, name, basename);
	}
}