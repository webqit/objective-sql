
import Lexer from './Lexer.js';
import Node from './Node.js';

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
	toJson() { return { name: this.NAME, basename: this.BASENAME }; }
	
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
		const escChar = this.getEscChar(context);
		const parts = Lexer.split(expr, ['.']);
		const parses = parts.map(s => (new RegExp(`^(?:([*\\w]+)|${escChar}([^${escChar}]+)${escChar})$`)).exec(s.trim())).filter(s => s);
		if (parses.length !== parts.length) return;
		const get = x => x?.[1] || x?.[2];
		return new this(context, get(parses.pop()), get(parses.pop()));
	}

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json) {
		if (!('name' in json)) return;
		return new this(context, json.name, json.basename);
	}
}