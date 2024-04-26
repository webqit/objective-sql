
import Lexer from '../Lexer.js';
import Node from '../Node.js';

export default class Math extends Node {
	
	/**
	 * Instance properties
	 */
	OPERATOR = '';
	OPERANDS = [];

	/**
	 * @constructor
	 */
	constructor(context, operator, ...operands) {
		super(context);
		this.OPERATOR = operator;
		this.OPERANDS = operands;
	}

	/**
	 * API for generic operations
	 * 
	 * @param String operator 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	expression(operator, ...operands) {
		if (this.OPERATOR && this.OPERATOR !== operator) {
			return (new this.constructor(this)).expression(operator, this, ...operands);
		}
		this.OPERATOR = operator;
		return (this.build('OPERANDS', operands), this);
	}

	/**
	 * API for "+"
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	sum(...operands) { return this.expression('+', ...operands); }

	/**
	 * API for "-"
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	sub(...operands) { return this.expression('-', ...operands); }

	/**
	 * API for "/"
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	div(...operands) { return this.expression('/', ...operands); }

	/**
	 * API for "*"
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	times(...operands) { return this.expression('*', ...operands); }

	/**
	 * @inheritdoc
	 */
	stringify() { return this.OPERANDS.join(` ${ this.OPERATOR } `); }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		for (const operator of ['\\*', '\\/','\\+', '\\-']) {
			let { tokens, matches } = Lexer.lex(expr, [`(\\s+)?${ operator }(\\s+)?`], { useRegex: 'i' });
			if (tokens.filter(s => s.trim()).length < 2) continue; // Note that we're not simply asking matches.length; think SELECT * FROM
			return new this(context, matches.pop().trim(), ...(await Promise.all(tokens.map(expr => parseCallback(context, expr.trim())))));
		}
	}
}