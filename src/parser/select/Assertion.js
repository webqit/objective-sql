
import { _unwrap } from '@webqit/util/str/index.js';
import Lexer from '@webqit/util/str/Lexer.js';
import Condition from './Condition.js';
import Node from '../Node.js';

export default class Assertion extends Node {
	
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
	 * API for generic expressions
	 * 
	 * @param String operator 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	expression(operator, ...operands) {
		if (this.OPERATOR) this.OPERANDS.splice(0);
		this.OPERATOR = operator;
		return this.build('OPERANDS', operands);
	}

	/**
	 * API for "="
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	equal(...operands) { return this.expression('=', ...operands); }

	/**
	 * @alias equal
	 */
	eq(...operands) { return this.equal(...operands); }

	/**
	 * API for "="
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	notEqual(...operands) { return this.expression('<>', ...operands); }

	/**
	 * @alias notEqual
	 */
	notEq(...operands) { return this.notEqual(...operands); }

	/**
	 * API for "<"
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	lesserThan(...operands) { return this.expression('<', ...operands); }

	/**
	 * @alias lesserThan
	 */
	lt(...operands) { return this.lesserThan(...operands); }

	/**
	 * API for "<="
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	lessThanOrEqual(...operands) { return this.expression('<=', ...operands); }

	/**
	 * @alias lessThanOrEqual
	 */
	ltOrEq(...operands) { return this.lessThanOrEqual(...operands); }

	/**
	 * API for ">"
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	greaterThan(...operands) { return this.expression('>', ...operands); }
	
	/**
	 * @alias greaterThan
	 */
	gt(...operands) { return this.greaterThan(...operands); }

	/**
	 * API for ">="
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	greaterThanOrEqual(...operands) { return this.expression('>=', ...operands); }
	
	/**
	 * @alias greaterThanOrEqual
	 */
	gtOrEq(...operands) { return this.greaterThanOrEqual(...operands); }

	/**
	 * API for "IN"
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	in(...operands) { return this.expression('IN', ...operands); }

	/**
	 * API for "ANY"
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	any(...operands) { return this.expression('ANY', ...operands); }

	/**
	 * API for "LIKE"
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	like(...operands) { return this.expression('LIKE', ...operands); }

	/**
	 * API for "IS NULL"
	 * 
	 * @param Any operand 
	 * 
	 * @returns this
	 */
	isNull(...operands) { return this.expression('IS NULL', ...operands); }

	/**
	 * API for "IS NOT NULL"
	 * 
	 * @param Any operand 
	 * 
	 * @returns this
	 */
	isNotNull(...operands) { return this.expression('IS NOT NULL', ...operands); }

	/**
	 * API for "IS TRUE"
	 * 
	 * @param Any operand 
	 * 
	 * @returns this
	 */
	isTrue(...operands) { return this.expression('IS TRUE', ...operands); }

	/**
	 * API for "IS NOT TRUE"
	 * 
	 * @param Any operand 
	 * 
	 * @returns this
	 */
	isNotTrue(...operands) { return this.expression('IS NOT TRUE', ...operands); }

	/**
	 * API for "IS FALSE"
	 * 
	 * @param Any operand 
	 * 
	 * @returns this
	 */
	isFalse(...operands) { return this.expression('IS FALSE', ...operands); }

	/**
	 * API for "IS NOT FALSE"
	 * 
	 * @param Any operands 
	 * 
	 * @returns this
	 */
	isNotFalse(...operands) { return this.expression('IS NOT FALSE', ...operands); }

	/**
	 * API for "IS UNKNOWN"
	 * 
	 * @param Any operand 
	 * 
	 * @returns this
	 */
	isUnknow(...operands) { return this.expression('IS UNKNOWN', ...operands); }

	/**
	 * API for "IS NOT UNKNOWN"
	 * 
	 * @param Any operand 
	 * 
	 * @returns this
	 */
	isNotUnknow(...operands) { return this.expression('IS NOT UNKNOWN', ...operands); }

	/**
	 * API for "IS DISTINCT FROM"
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	isDistinctFrom(...operands) { return this.expression('IS DISTINCT FROM', ...operands); }

	/**
	 * API for "IS NOT DISTINCT FROM"
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	isNotDistinctFrom(...operands) { return this.expression('IS NOT DISTINCT FROM', ...operands); }

	/**
	 * API for "IS BETWEEN"
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	isBetween(...operands) { return this.expression('IS BETWEEN', ...operands); }

	/**
	 * API for "IS NOT BETWEEN"
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	isNotBetween(...operands) { return this.expression('IS NOT BETWEEN', ...operands); }

	/**
	 * API for "IS BETWEEN SYMMETRIC"
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	isBetweenSymmetric(...operands) { return this.expression('IS BETWEEN SYMMETRIC', ...operands); }

	/**
	 * API for "IS NOT BETWEEN SYMMETRIC"
	 * 
	 * @param Array operands 
	 * 
	 * @returns this
	 */
	isNotBetweenSymmetric(...operands) { return this.expression('IS NOT BETWEEN SYMMETRIC', ...operands); }

	/**
	 * A shortcut method to Condition.
	 * 
	 * @param Array args
	 * 
	 * @returns Assertion
	 */
	and(...args) { return (new Condition(this, 'AND')).and(this, ...args) ;}

	/**
	 * A shortcut method to Condition.
	 * 
	 * @param Array args
	 * 
	 * @returns Assertion
	 */
	or(...args) { return (new Condition(this, 'OR')).or(this, ...args) ;}
	
	/**
	 * @inheritdoc
	 */
	stringify() {
		const operands = this.OPERANDS.slice(0);
		const sql = [
			operands.shift(), 
			this.OPERATOR.toUpperCase(),
		];
		const rightHandSide = operands;
		if (this.OPERATOR === 'IN') sql.push(`(${ rightHandSide.join(',') })`);
		else if (/BETWEEN/i.test(this.OPERATOR)) sql.push(`(${ rightHandSide.join(' AND ') })`);
		else sql.push(`${ rightHandSide.join(' ') }`);
		return sql.filter(s => s).join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		const { tokens: [lhs, rhs = ''], matches: [operator] } = Lexer.lex(expr, [this.regex], { useRegex: 'i' });
		if (!operator) return;
		const $operator = operator.trim().toUpperCase();
		const $operands = [lhs];
		if ($operator === 'IN') {
			$operands.push(...Lexer.split(_unwrap(rhs.trim(), '(', ')'), [',']));
		} else if (/BETWEEN/.test($operator)) {
			$operands.push(...Lexer.split(rhs, [' AND ']));
		} else if (rhs) {
			$operands.push(rhs);
		}
		return new this(context, $operator, ...(await Promise.all($operands.map(opr => parseCallback(context, opr.trim())))));
	}

	static regex = '(([ ]+(?:NOT[ ]+)?IS[ ]+(?:NOT[ ]+)?(TRUE|FALSE|NULL|UNKNOWN|DISTINCT[ ]+FROM)[ ]+)|[ ]+(ISNULL|NOTNULL|IN|ANY|LIKE|(?:NOT[ ]+)?BETWEEN(?:[ ]+SYMMETRIC)?)[ ]+|(?:[ ]+)?(=|<=|>=|!=|<>)(?:[ ]+)?)';
}