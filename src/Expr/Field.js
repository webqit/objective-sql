
/**
 * @imports
 */
import {
	AbstractionInterface,
	ReferenceInterface,
	Lexer
} from '../index.js';
import _wrapped from '@web-native-js/commons/str/wrapped.js';
import _unwrap from '@web-native-js/commons/str/unwrap.js';
import _objFrom from '@web-native-js/commons/obj/from.js';
import FieldInterface from './FieldInterface.js';

/**
 * ---------------------------
 * Field class
 * ---------------------------
 */				

const Field = class extends FieldInterface {
	
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
	 * @inheritdoc
	 */
	eval(tempRow, database, trap = {}) {
		if (this.expr instanceof AbstractionInterface) {
			var value = this.expr.eval(database, trap);
		} else {
			var value = this.expr.eval(tempRow, trap);
		}
		return _objFrom(this.getAlias(), value);
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
	static parse(expr, parseCallback, Static = Field) {
		var splits = Lexer.split(expr, [' (as )?'], {useRegex:'i', preserveDelims:true});
		var exprParse = null;
		var alias = splits.pop().trim();
		var claused = alias.substr(0, 3).toLowerCase() === 'as ';
		if (claused) {
			// With an "AS" clause, its easy to obtain the alias...
			// E.g: SELECT first_name fname, 4 + 5 result, 5 + 5
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
		return new Static(exprParse, alias, claused);
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
	getAlias() {
		var alias = this.alias 
		if (!alias) {
			alias = Lexer.split(this.expr.toString(), ['.']).pop();
			if (_wrapped(alias, '`', '`')) {
				alias = _unwrap(alias, '`', '`');
			}
		};
		return alias;
	}
};

/**
 * @exports
 */
export default Field;
