
import { _wrapped, _unwrap } from '@webqit/util/str/index.js';
import Lexer from '../Lexer.js';
import Node from '../Node.js';
import Select from './Select.js';
import Identifier from '../Identifier.js';
import CaseConstruct from './case/CaseConstruct.js';
import Assertion from './Assertion.js';
import Math from './Math.js';
import Aggr from './Aggr.js';
import Func from './Func.js';
import Json from './Json.js';
import Prim from './Prim.js';
import PgConcat from './str/PgConcat.js';
import Path from './Path.js';
import Str from './str/Str.js';
import Num from './Num.js';

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
	 * Helper method to start a subquery.
	 * 
	 * @param  Array args
	 * 
	 * @returns Void
	 */
	select(...args) { return this.build('EXPR', args, Select, 'fields'); }
	
	/**
	 * @inheritdoc
	 */
	stringify() { return '(' + this.EXPR.stringify() + ')'; }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		if (!_wrapped(expr, '(', ')') || Lexer.match(expr, [' ']).length && Lexer.split(expr, []).length === 2/* recognizing the first empty slot */) return;
		return new this(context, await parseCallback(context, _unwrap(expr, '(', ')'), this.exprTypes.concat(Select)));
	}

	/**
	 * @property Array
	 */
	static get exprTypes() {
		return [
			this,
			CaseConstruct,
			PgConcat,
			Assertion,
			Math,
			Aggr,
			Func,
			Num,
			Str,
			Json,
			Prim,
			Path,
			Identifier,
		];
	}
}