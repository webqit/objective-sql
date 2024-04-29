
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
		const escChar = this.getEscChar(context);
		// With an "AS" clause, its easy to obtain the alias...
		// E.g: SELECT first_name AS fname, 4 + 5 AS result, 5 + 5
		// Without an "AS" clause, its hard to determine if an expression is actually aliased...
		// E.g: In the statement SELECT first_name fname, 4 + 5 result, 5 + 5, (SELECT ...) alias FROM ...,
		let [ , $expr, $separator, aliasUnescaped, /*esc*/, aliasEscaped ] = (new RegExp(`^([\\s\\S]+?)` + `(?:` + `(\\s+AS\\s+|\\s+)` + `(?:([\\w]+)|(${ escChar })((?:\\4\\4|[^\\4])+)\\4)` + `)?$`, 'i')).exec(expr.trim()) || [];
		let exprNode;
		if (!$separator?.trim() && !$expr.trim().endsWith(')')) {
			exprNode = await parseCallback(context, $expr, this.exprTypes, { assert: false });
			if (!exprNode) {
				aliasUnescaped = aliasEscaped = null;
				$expr = expr; // IMPORTANT
			}
		}
		if (!exprNode) { exprNode = await parseCallback(context, $expr, this.exprTypes); }
		const alias = aliasUnescaped || this.normalizeEscChars(context, aliasEscaped);
		const claused = !!$separator?.trim();
		const instance = new this(context, exprNode);
		instance.as(alias, claused);
		return instance;
	}

	/**
	 * @property Array
	 */
	static exprTypes = [];
}