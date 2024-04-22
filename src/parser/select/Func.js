
import Lexer from '@webqit/util/str/Lexer.js';
import { _unwrap } from '@webqit/util/str/index.js';
import Node from '../Node.js';

export default class Func extends Node {

	/**
	 * Instance properties
	 */
	NAME = '';
	ARGS_LIST = [];

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
	args(...args) { return this.build('ARGS_LIST', args); }
	
	/**
	 * @inheritdoc
	 */
	stringify() { return `${ this.NAME.toUpperCase() }(${ this.ARGS_LIST.join(',') })`; }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		if (!expr.endsWith(')') || Lexer.match(expr, [' ']).length) return;
		const [ , name, args ] = /^(\w+)\((.+)\)$/i.exec(expr);
		const instance = new this(context, name);
		instance.args(...(await Promise.all(Lexer.split(args, [',']).map(arg => parseCallback(instance, arg.trim())))));
		return instance;
	}
}