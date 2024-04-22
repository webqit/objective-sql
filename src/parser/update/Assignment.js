
import { _last } from '@webqit/util/arr/index.js';
import { _after, _before } from '@webqit/util/str/index.js';
import { _isUndefined, _isArray, _isNumber } from '@webqit/util/js/index.js';
import Lexer from '@webqit/util/str/Lexer.js';
import Node from '../Node.js';

export default class Assignment extends Node {

		
	/**
	 * Instance properties
	 */
	expr;

	/**
	 * @constructor
	 */
	constructor(context, initKeyword) {
		super(context);
		this.initKeyword = initKeyword;
	}

	/**
	 * @inheritdoc
	 */
	set(reference, val, operator = '=', postIncrDecr = false) {
		this.reference = reference;
		this.val = val;
		this.operator = operator;
		this.postIncrDecr = postIncrDecr;
		return this;
	}
	 
	/**
	 * @inheritdoc
	 */
	eval(context = null, params = {}) {
		var val, initialVal, reference = this.reference.getEval(context, params);
		if (['++', '--'].includes(this.operator)) {
			initialVal = this.reference.eval(context, params);
			if (!_isNumber(initialVal)) {
				throw new Error(this.reference + ' must be a number!');
			}
			if (this.operator === '++') {
				val = initialVal + 1;
			} else {
				val = initialVal - 1;
			}
		} else if (['+=', '-=', '*=', '/='].includes(this.operator)) {
			var operandA = reference.get();
			var operandB = this.val.eval(context, params);
			if (this.operator !== '+=' && (!_isNumber(operandA) || !_isNumber(operandB))) {
				throw new Error(this + ' - operands must each be a number!');
			}
			if (this.operator === '*=') {
				val = operandA * operandB;
			} else if (this.operator === '/=') {
				val = operandA / operandB;
			} else if (this.operator === '-=') {
				val = operandA - operandB;
			} else {
				val = operandA + operandB;
			}
		} else {
			val = this.val.eval(context, params);
		}
		reference.set(val, this.initKeyword);
		if (params && _isArray(params.references)) {
			_pushUnique(params.references, this.reference.toString());
		}
		return this.postIncrDecr ? initialVal : val;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify(params = {}) {
		if (['++', '--'].includes(this.operator)) {
			return this.postIncrDecr
				? this.reference.stringify(params) + this.operator
				: this.operator + this.reference.stringify(params);
		}
		return (this.initKeyword ? this.initKeyword + ' ' : '')
			+ [this.reference.stringify(params), this.operator.trim(), this.val.stringify(params)].join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		var parse = Lexer.lex(expr, this.operators.concat([testBlockEnd]));
		if (!parse.matches.length) return;
		var initKeyword, reference, val, operator = parse.matches[0].trim(), isIncrDecr = ['++', '--'].includes(operator), postIncrDecr;
		if (isIncrDecr) {
			postIncrDecr = (expr.trim().endsWith('++') || expr.trim().endsWith('--'));
			reference = parse.tokens[postIncrDecr ? 'shift' : 'pop']().trim();
		} else {
			reference = parse.tokens.shift().trim();
			val = parse.tokens.shift().trim();
		}
		if (['var', 'let', 'const'].includes(_before(reference, ' '))) {
			if (operator !== '=') { throw new SyntaxError('Invalid declaration: ' + expr); }
			initKeyword = _before(reference, ' ');
			reference = _after(reference, ' ').trim();
		}
		const instance = new this(context, initKeyword);
		if (!((reference = await parseCallback(instance, reference, null, { role: 'ASSIGNMENT_SPECIFIER' })) instanceof ReferenceInterface) 
		|| (!isIncrDecr && !(val = await parseCallback(instance, val)))) { throw new SyntaxError(expr); }
		return instance.set(reference, val, operator, postIncrDecr);
	}
}

/**
 * @prop array
 */
Assignment.operators = [
	'+=',
	'-=',
	'*=',
	'/=',
	'++',
	'--',
];

const testBlockEnd = (a, b) => {
	// Match exactly "=", not "=>", "==", "==="
	if (!a.endsWith('=') && b.startsWith('=') && !b.startsWith('=>') && !b.startsWith('==') && !b.startsWith('===')) {
		return '=';
	}
	return false;
};