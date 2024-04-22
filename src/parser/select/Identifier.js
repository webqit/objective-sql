
import Lexer from '@webqit/util/str/Lexer.js';
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
		return this.autoEsc([this.BASENAME, this.NAME].filter(s => s)).join('.') + (
			this.FLAGS.length ? ` ${ this.FLAGS.map(s => s.replace(/_/g, ' ')).join(' ') }` : ''
		);
	}
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		const esc = context?.params?.dialect === 'mysql' ? '`' : '"';
		const parts = Lexer.split(expr, ['.']);
		const parses = parts.map(s => (new RegExp(`^(?:(\\w+)|${esc}(.+)${esc})$`)).exec(s.trim())).filter(s => s);
		if (parses.length !== parts.length) return;
		return new this(context, ...parses.map(s => s[1] || s[2]));
	}
}