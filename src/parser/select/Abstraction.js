
import { _wrapped, _unwrap } from '@webqit/util/str/index.js';
import Lexer from '@webqit/util/str/Lexer.js';
import Node from '../Node.js';

export default class Abstraction extends Node {
	
	/**
	 * Instance properties
	 */
	EXPR;

	/**
	 * @constructor
	 */
	constructor(context, expr) {
		super(context);
		this.EXPR = expr;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() { return '(' + this.EXPR.stringify() + ')'; }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		if (!_wrapped(expr, '(', ')') || Lexer.match(expr, [' ']).length && Lexer.split(expr, []).length === 2/* recognizing the first empty slot */) return;
		return new this(context, await parseCallback(context, _unwrap(expr, '(', ')')));
	}
}