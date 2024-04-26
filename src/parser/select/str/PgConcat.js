
import Lexer from '../../Lexer.js';
import Node from '../../Node.js';

export default class PgConcat extends Node {
	
	/**
	 * Instance properties
	 */
	EXPRS = [];

	/**
	 * @constructor
	 */
	constructor(context, ...exprs) {
		super(context);
		this.EXPRS = exprs;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() { return this.EXPRS.join(' || '); }
	 
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		let { tokens, matches } = Lexer.lex(expr, [`||`]);
		if (!matches.length) return;
		return new this(context, ...(await Promise.all(tokens.map(expr => parseCallback(context, expr.trim())))));
	}
}
