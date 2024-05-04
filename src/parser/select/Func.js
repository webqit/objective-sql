
import Lexer from '../Lexer.js';
import Expr from '../abstracts/Expr.js';
import Node from '../abstracts/Node.js';

export default class Func extends Node {

	/**
	 * Instance properties
	 */
	NAME = '';
	ARGS = [];

	/**
	 * @constructor
	 */
	constructor(context, name) {
		super(context);
		this.NAME = name;
	}
	
	/**
	 * Sets the name
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
	 * @inheritdoc
	 */
	args(...args) { return this.build('ARGS', args, Expr.Types); }

	/**
	 * @inheritdoc
	 */
	toJson() {
		return {
			name: this.NAME,
			args: this.ARGS.map(o => o.toJson()),
			flags: this.FLAGS,
		};
	}

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json) {
		if (typeof json?.name !== 'string' || !Array.isArray(json.args)) return;
		const instance = (new this(context, json.name)).withFlag(...(json.flags || []));
		instance.args(...json.args);
		return instance;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() { return `${ this.NAME.toUpperCase() }(${ this.ARGS.join(',') })`; }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		if (!expr.endsWith(')') || Lexer.match(expr, [' ']).length) return;
		const [ , name, args ] = /^(\w+)\(([\s\S]+)\)$/i.exec(expr);
		const instance = new this(context, name);
		instance.args(...(await Promise.all(Lexer.split(args, [',']).map(arg => parseCallback(instance, arg.trim())))));
		return instance;
	}
}