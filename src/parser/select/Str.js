
import Lexer from '@webqit/util/str/Lexer.js';
import { _wrapped, _unwrap } from '@webqit/util/str/index.js';
import Node from '../Node.js';

export default class Str extends Node {
	
	/**
	 * Instance properties
	 */
	EXPR = '';
	QUOTE = '';

	/**
	 * @constructor
	 */
	constructor(context, expr, quote = "'") {
		super(context);
		this.EXPR = expr;
		this.QUOTE = quote;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() { return `${ this.QUOTE }${ this.EXPR }${ this.QUOTE }`; }
	 
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		const quotes = context?.params?.dialect === 'mysql' ? ['"', "'"] : ["'"], $ = {};
		if (!($.quote = quotes.find(q => _wrapped(expr, q, q))) || Lexer.match(expr, [' ']).length) return;
		return new this(
			context,
			_unwrap(expr, $.quote, $.quote),
			$.quote
		);
	}
}
