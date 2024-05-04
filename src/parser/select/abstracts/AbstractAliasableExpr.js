
import Identifier from '../Identifier.js';
import Node from '../../abstracts/Node.js';
import Parens from '../Parens.js';
import Expr from '../../abstracts/Expr.js';

export default class AbstractAliasableExpr extends Node {
	
	/**
	 * Instance properties
	 */
	$EXPR;
	ALIAS;
	CLAUSED;

	/**
	 * @constructor
	 */
	constructor(context, expr) {
		super(context);
		this.$EXPR = expr;
	}

	/**
	 * @property String
	 */
	get NAME() { return this.$EXPR?.NAME; }

	/**
	 * @property String
	 */
	get BASENAME() { return this.$EXPR?.BASENAME; }

	/**
	 * @property Node
	 */
	get EXPR() { return this.$EXPR?.EXPR || this.$EXPR; }

	/**
	 * Sets the name
	 * 
	 * @param String name
	 * 
	 * @returns this
	 */
	name(name) { return (this.build('$EXPR', [name], Identifier, 'name'), this); }

	/**
	 * Sets the basename
	 * 
	 * @param String basename
	 * 
	 * @returns this
	 */
	basename(name) { return (this.build('$EXPR', [name], Identifier, 'basename'), this); }

	/**
	 * Sets the expr
	 * 
	 * @param Any expr
	 * 
	 * @returns this
	 */
	query(expr) { return (this.build('$EXPR', [expr], Parens, 'query'), this); }

	/**
	 * Sets the expr
	 * 
	 * @param Any expr
	 * 
	 * @returns this
	 */
	expr(expr) { return (this.build('$EXPR', [expr], this.constructor.exprTypes), this); }
	
	/**
	 * Sets the alias
	 * 
	 * @param String alias
	 * 
	 * @returns this
	 */
	as(alias, claused = true) {
		this.build('ALIAS', [alias], Identifier);
		this.CLAUSED = claused;
		return this;
	}

	/**
	 * @inheritdoc
	 */
	toJson() { return { expr: this.$EXPR?.toJson(), alias: this.ALIAS?.toJson(), claused: this.CLAUSED, flags: this.FLAGS }; }

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json) {
		const instance = (new this(context)).withFlag(...(json.flags || []));
		if (json?.expr) {
			instance.expr(json.expr);
			if (json.alias) instance.as(json.alias, json.claused);
		} else if (json) instance.expr(json);
		return instance;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() { return [this.$EXPR, this.CLAUSED ? 'AS' : '', this.ALIAS].filter(s => s).join(' '); }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		const instance = new this(context);
		const escChar = this.getEscChar(context);
		// With an "AS" clause, its easy to obtain the alias...
		// E.g: SELECT first_name AS fname, 4 + 5 AS result, 5 + 5
		// Without an "AS" clause, its hard to determine if an expression is actually aliased...
		// E.g: In the statement SELECT first_name fname, 4 + 5 result, 5 + 5, (SELECT ...) alias FROM ...,
		let [ , $expr, $separator, aliasUnescaped, /*esc*/, aliasEscaped ] = (new RegExp(`^([\\s\\S]+?)` + `(?:` + `(\\s+AS\\s+|\\s+)` + `(?:([\\w]+)|(${ escChar })((?:\\4\\4|[^\\4])+)\\4)` + `)?$`, 'i')).exec(expr.trim()) || [];
		let exprNode;
		if (!$separator?.trim() && !$expr.trim().endsWith(')')) {
			exprNode = await parseCallback(instance, $expr, this.exprTypes, { assert: false });
			if (!exprNode) {
				aliasUnescaped = aliasEscaped = null;
				$expr = expr; // IMPORTANT
			}
		}
		if (!exprNode) { exprNode = await parseCallback(instance, $expr, this.exprTypes); }
		instance.expr(exprNode);
		if (aliasUnescaped || aliasEscaped) {
			const alias = new Identifier(instance, aliasUnescaped || this.autoUnesc(instance, aliasEscaped));
			const claused = !!$separator?.trim();
			instance.as(alias, claused);
		}
		return instance;
	}

	/**
	 * @property Array
	 */
	static get exprTypes() { return Expr.Types; }
}