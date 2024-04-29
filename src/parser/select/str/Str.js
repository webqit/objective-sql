
import Lexer from '../../Lexer.js';
import { _wrapped, _unwrap } from '@webqit/util/str/index.js';
import Node from '../../Node.js';

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
	stringify() { return `${ this.QUOTE }${ this.EXPR.replace(new RegExp(this.QUOTE, 'g'), this.QUOTE.repeat(2)) }${ this.QUOTE }`; }
	 
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		const quoteChars = this.getQuoteChars(context), $ = {};
		if (!($.quote = quoteChars.find(q => _wrapped(expr, q, q))) || Lexer.match(expr, [' ']).length) return;
		return new this(
			context,
			_unwrap(expr, $.quote, $.quote).replace(new RegExp($.quote + $.quote, 'g'), $.quote),
			$.quote
		);
	}
}
