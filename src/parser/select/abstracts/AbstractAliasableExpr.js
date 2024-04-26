
import Lexer from '../../Lexer.js';
import Identifier from '../../Identifier.js';
import Node from '../../Node.js';

export default class AbstractAliasableExpr extends Node {
	
	/**
	 * Instance properties
	 */
	EXPR;
	ALIAS;
	CLAUSED;

	/**
	 * @constructor
	 */
	constructor(context, expr) {
		super(context);
		this.EXPR = expr;
	}

	/**
	 * @property String
	 */
	get NAME() { return this.EXPR instanceof Identifier ? this.EXPR.NAME : null; }

	/**
	 * @property String
	 */
	get BASENAME() { return this.EXPR instanceof Identifier ? this.EXPR.BASENAME : null; }
	
	/**
	 * Sets the alias
	 * 
	 * @param String alias
	 * 
	 * @returns this
	 */
	as(alias, claused = true) {
		this.ALIAS = alias;
		this.CLAUSED = claused;
		return this;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() { return [this.EXPR, this.CLAUSED ? 'AS' : '', this.autoEsc(this.ALIAS)].filter(s => s).join(' '); }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		const [exprSpec, claused, alias] = this.parseAlias(context, expr);
		const instance = new this(context, await parseCallback(context, exprSpec, this.exprTypes));
		instance.as(alias, claused);
		return instance;
	}

	/**
	 * Utility to parse alias.
	 * 
	 * @param AbstractClient context
	 * @param String expr
	 * 
	 * @returns Array
	 */
	static parseAlias(context, expr) {
		// With an "AS" clause, its easy to obtain the alias...
		// E.g: SELECT first_name AS fname, 4 + 5 AS result, 5 + 5
		// Without an "AS" clause, its hard to determine if an expression is actually aliased...
		// E.g: In the statement SELECT first_name fname, 4 + 5 result, 5 + 5, (SELECT ...) alias FROM ...,
		const escChar = this.getEscChar(context);
		let { tokens: [ exprSpec, alias = '' ], matches: [ separator ] } = Lexer.lex(expr.trim(), [`([\\w${escChar}]|^)(\\s+AS\\s+|\\s+)[${escChar}A-Za-z]`], { useRegex:'i' });
		// Note in the regex that separator will cut exprSpec's last letter (when not an enclosure "()") and alias' first letter.
		if (separator) {
			const separatorTokens = separator.replace(/\s+/, ' ').split(' ');
			exprSpec = `${ exprSpec }${ separatorTokens.shift() }`;
			alias = `${ separatorTokens.pop() }${ alias }`.trim();
			separator = separatorTokens.join('');
		}
		return [exprSpec, !!separator, alias.replace(new RegExp(escChar, 'g'), '')];
	}

	/**
	 * @property Array
	 */
	static exprTypes = [];
}