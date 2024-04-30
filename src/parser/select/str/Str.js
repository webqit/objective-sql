
import { _wrapped, _unwrap } from '@webqit/util/str/index.js';
import Lexer from '../../Lexer.js';
import Node from '../../Node.js';

export default class Str extends Node {
	
	/**
	 * Instance properties
	 */
	VALUE = '';
	QUOTE = '';

	/**
	 * @constructor
	 */
	constructor(context, expr, quote = "'") {
		super(context);
		this.VALUE = expr;
		this.QUOTE = quote;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() { return `${ this.QUOTE }${ this.VALUE.replace(new RegExp(this.QUOTE, 'g'), this.QUOTE.repeat(2)) }${ this.QUOTE }`; }
	 
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		const [text, quote] = this.parseText(context, expr) || [];
		if (!quote) return;
		return new this(
			context,
			text,
			quote
		);
	}

	static parseText(context, expr) {
		const quoteChars = this.getQuoteChars(context), $ = {};
		if (!($.quote = quoteChars.find(q => _wrapped(expr, q, q))) || Lexer.match(expr, [' ']).length) return;
		return [
			_unwrap(expr, $.quote, $.quote).replace(new RegExp($.quote + $.quote, 'g'), $.quote),
			$.quote
		];
	}
}
