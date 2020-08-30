
/**
 * @imports
 */
import {
	AbstractionInterface,
	ReferenceInterface,
} from '../index.js';
import _wrapped from '@web-native-js/commons/str/wrapped.js';
import _objFrom from '@web-native-js/commons/obj/from.js';
import Lexer from '@web-native-js/commons/str/Lexer.js';
import FieldInterface from './FieldInterface.js';

/**
 * ---------------------------
 * Field class
 * ---------------------------
 */				

export default class Field extends FieldInterface {
	
	/**
	 * @inheritdoc
	 */
	constructor(expr, alias, claused = false) {
		super();
		this.expr = expr;
		this.alias = alias;
		this.claused = claused;
	}
		
	/**
	 * --------------
	 */
	
	/**
	 * @inheritdoc
	 */
	as(alias) {
		this.alias = alias;
		this.claused = true;
		return this;
	}
	
	/**
	 * @inheritdoc
	 */
	getName() {
		// Without backticks
		return (this.expr.name || '').replace(/`/g, '');
	}
		
	/**
	 * @inheritdoc
	 */
	getAlias() {
		return (this.alias || '').replace(/`/g, '') || this.getName() || this.expr + '';
	}
	
	/**
	 * @inheritdoc
	 */
	eval(tempRow, database, params = {}) {
		var alias = this.getAlias();
		if (params.fieldsByReference && this.expr instanceof ReferenceInterface) {
			var reference = this.expr.getEval(tempRow, params);
			return {
				get [alias] () {
					return reference.get();
				},
				set [alias] (val) {
					reference.set(val);
					return true;
				},
			};
		} else {
			var value;
			if (this.expr instanceof AbstractionInterface) {
				value = this.expr.eval(database, params);
			} else {
				value = this.expr.eval(tempRow, params);
			}
			if (params.fieldsByReference) {
				return {
					get [alias] () {
						return value;
					},
					set [alias] (val) {
						throw new Error('"' + alias + '" cannot be modified; not a reference!');
					},
				};
			}
			return _objFrom(alias, value);
		}
	}
	
	/**
	 * @inheritdoc
	 */
	toString(tempRow = null) {
		return [this.expr.toString(tempRow), this.claused ? 'AS' : '', this.alias].filter(a => a).join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}) {
		var splits = Lexer.split(expr, [' (as )?'], {useRegex:'i', preserveDelims:true});
		var exprParse = null;
		var alias = splits.pop().trim();
		var claused = alias.substr(0, 3).toLowerCase() === 'as ';
		if (claused) {
			// With an "AS" clause, its easy to obtain the alias...
			// E.g: SELECT first_name AS fname, 4 + 5 AS result, 5 + 5
			alias = alias.substr(3).trim();
			exprParse = parseCallback(splits.join('').trim());
		} else if (splits.length && (!alias.match(/[^0-9a-zA-Z_]/) || _wrapped(alias, '`', '`'))) {
			// Without an "AS" clause, its hard to determine if an expression is actually aliased...
			// E.g: In the statement SELECT first_name fname, 4 + 5 result, 5 + 5 FROM ...,
			// we can only assume that the last space-separated expr is rhe alias.
			// When that fails, then it is most-likely there is no alias. 
			try {
				exprParse = parseCallback(splits.join('').trim());
			} catch(e) {}
		}
		if (!exprParse) {
			alias = null;
			exprParse = parseCallback(expr);
		}
		exprParse.isFieldName = true;
		return new this(exprParse, alias, claused);
	}
};