
/**
 * @imports
 */
import {
	AbstractionInterface,
	ReferenceInterface,
	CallInterface,
} from '../grammar.js';
import _isArray from '@webqit/util/js/isArray.js';
import _wrapped from '@webqit/util/str/wrapped.js';
import _objFrom from '@webqit/util/obj/from.js';
import _each from '@webqit/util/obj/each.js';
import Lexer from '@webqit/util/str/Lexer.js';
import FieldInterface from './FieldInterface.js';
import AggrInterface from './AggrInterface.js';

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
	getContextName() {
		if (this.expr.interpreted) {
			// .interpreted is always fully qualified.
			return _isArray(this.expr.interpreted) 
				? this.expr.interpreted[0].context.name 
				: this.expr.interpreted.context.name;
		}
		// May or may not b qualified
		return this.expr.context ? (this.expr.context.name || '').replace(/`/g, '') : '';
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
		return (this.alias || '').replace(/`/g, '') || this.getName() || this.expr.toString();
	}
	
	/**
	 * @inheritdoc
	 */
	getCallExprs() {
		return this.expr.meta.calls.concat(this.expr.meta.deep.calls || []).concat([this.expr]).filter(x => x instanceof CallInterface);
	}
	
	/**
	 * @inheritdoc
	 */
	getAggrExprs() {
		return this.expr.meta.calls.concat(this.expr.meta.deep.calls || []).concat([this.expr]).filter(x => x instanceof AggrInterface);
	}
	
	/**
	 * @inheritdoc
	 */
	eval(tempRow, database, params = {}) {
		
		var alias = this.getAlias();
		if (this.expr instanceof ReferenceInterface) {

			if (this.getName() === '*') {
				var multiple = this.expr.getEval(tempRow, params);
				_each(multiple, (name, ref) => {
					if (params.mode === 'readwrite') {
						Object.defineProperty(multiple, name, {
							get() {
								return ref.get();
							},
							set (val) {
								ref.set(val);
								return true;
							},
							enumerable: true,
						});
					} else {
						multiple[name] = ref.get();
					}
				});
				return multiple;
			}

			var reference = this.expr.getEval(tempRow, params);
			if (params.mode === 'readwrite') {
				return {
					get [alias] () {
						return reference.get();
					},
					set [alias] (val) {
						reference.set(val);
						return true;
					},
				};
			}
			return _objFrom(alias, reference.get());
		}

		var value;
		if (this.expr instanceof AbstractionInterface) {
			value = this.expr.eval(database, params);
		} else {
			value = this.expr.eval(tempRow, params);
		}
		if (params.mode === 'readwrite') {
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
	
	/**
	 * @inheritdoc
	 */
	stringify(params = {}) {
		return [this.expr.stringify(params), this.claused ? 'AS' : '', this.alias].filter(a => a).join(' ');
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
}