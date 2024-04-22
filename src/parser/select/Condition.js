
import Lexer from '@webqit/util/str/Lexer.js';
import Assertion from './Assertion.js';
import Node from '../Node.js';

export default class Condition extends Node {

	/**
	 * Instance properties
	 */
	LOGIC = '';
	ASSERTIONS = [];

	/**
	 * @constructor
	 */
	constructor(context, logic) {
		super(context);
		this.LOGIC = logic;
	}

	/**
	 * Establish an AND logic
	 * 
	 * @param  Array ...assertions 
	 * 
	 * @returns this
	 */
	and(...assertions) {
		if (this.LOGIC === 'OR') return (new this.constructor(this)).and(this, ...assertions);
		this.LOGIC = 'AND';
		return (this.build('ASSERTIONS', assertions, Assertion), this);
	}

	/**
	 * Establish an OR logic
	 * 
	 * @param  Array ...assertions 
	 * 
	 * @returns this
	 */
	or(...assertions) {
		if (this.LOGIC === 'AND') return (new this.constructor(this)).or(this, ...assertions);
		this.LOGIC = 'OR';
		return (this.build('ASSERTIONS', assertions, Assertion), this);
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() { return this.ASSERTIONS.map(expr => expr.stringify()).join(' ' + this.LOGIC + ' '); }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		for (const logic of ['AND', 'OR']) {
			const split = Lexer.split(expr, [`[ ]+${ logic }[ ]+`], { useRegex: 'i' });
			if (split.length > 1) {
				const instance = new this(logic);
				for (const $expr of tokens) instance[logic.toLowerCase()](await parseCallback(instance, $expr));
				return instance;
			}
		}
		
	}
}
