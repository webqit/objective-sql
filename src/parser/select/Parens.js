
import { _wrapped, _unwrap } from '@webqit/util/str/index.js';
import Identifier from './Identifier.js';
import Node from '../abstracts/Node.js';
import Expr from '../abstracts/Expr.js';
import Select from './Select.js';
import Lexer from '../Lexer.js';

export default class Parens extends Node {
	
	/**
	 * Instance properties
	 */
	$EXPR;

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
	 * Helper method to start a subquery.
	 * 
	 * @param  Array args
	 * 
	 * @returns Void
	 */
	query(...args) { return this.build('$EXPR', args, Select, 'select'); }

	/**
	 * Sets the expr
	 * 
	 * @param Any expr
	 * 
	 * @returns this
	 */
	expr(expr) { return (this.build('$EXPR', [expr], [Select, ...Expr.Types]), this); }

	/**
	 * @inheritdoc
	 */
	toJson() { return { expr: this.$EXPR?.toJson(), flags: this.FLAGS, }; }

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json) {
		if (!json?.expr || Object.keys(json).length !== (json.flags ? 2 : 1)) return;
		const instance = (new this(context)).withFlag(...(json.flags || []));
		instance.expr(json.expr);
		return instance;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() { return '(' + this.$EXPR.stringify() + ')'; }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		if (!_wrapped(expr, '(', ')') || Lexer.match(expr, [' ']).length && Lexer.split(expr, []).length === 2/* recognizing the first empty slot */) return;
		return new this(context, await parseCallback(context, _unwrap(expr, '(', ')'), [Select, ...Expr.Types]));
	}
}