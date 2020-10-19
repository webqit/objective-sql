
/**
 * @imports
 */
import { Call } from '@web-native-js/jsen';
import _mixin from '@onephrase/util/js/mixin.js';
import _flatten from '@onephrase/util/arr/flatten.js';
import _find from '@onephrase/util/obj/find.js';
import _before from '@onephrase/util/str/before.js';
import Lexer from '@onephrase/util/str/Lexer.js';
import AggrInterface from './AggrInterface.js';
import Window from './Window.js';

/**
 * ---------------------------
 * Aggr class
 * ---------------------------
 */				
export default class Aggr extends _mixin(Call, AggrInterface) {

	/**
	 * @inheritdoc
	 */
	constructor(reference, args) {
		super();
		this.reference = reference;
		this.args = args;
	}
	 
	/**
	 * @inheritdoc
	 */
	eval(context, params = {}) {
		var args = this.args.list.slice();
		args.unshift(this.window ? context.WINDOWS[this.window.stringify()] : context.AGGR.rows);
		return this.reference.getEval(context, params).exec(args);
	}
	
	/**
	 * @inheritdoc
	 */
	toString() {
		return this.stringify();
	}
	
	/**
	 * @inheritdoc
	 */
	stringify(params = {}) {
		return super.stringify(params) + (this.window ? ' OVER ' + this.window.stringify(params) : '');
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}) {
		var aggrMatch = null;
		var aggrMatchRegex = _flatten(this.funcs).join("\\(|") + "\\(";
		if (aggrMatch = expr.trim().match(new RegExp('^(' + aggrMatchRegex + ')', 'i'))) {
			var funcName = _before(aggrMatch[0], '(').toUpperCase();
			var funcCategory = _find(this.funcs, val => val === funcName, true)[0];
			var splits = Lexer.split(expr, ['OVER'], {ci:true});
			if (funcCategory === 'explicitOver' && splits.length === 1) {
				throw new Error(aggrMatch[0] + '() requires an OVER clause!');
			}
			var instance = super.parse(splits.shift().trim(), parseCallback, params);
			instance.funcCategory = funcCategory;
			if (splits.length) {
				instance.window = parseCallback(splits.pop().trim(), [Window]);
			}
			return instance;
		}
	}
};

/**
 * @prop object
 */
Aggr.funcs = {
	normal: [
		'AVG', 
		'BIT_AND', 
		'BIT_OR', 
		'BIT_XOR', 
		'COUNT', 
		'JSON_ARRAYAGG', 
		'JSON_OBJECTAGG', 
		'MAX', 
		'MIN',
		'STDDEV_POP',
		'STDDEV',
		'STD',
		'STDDEV_SAMP',
		'SUM',
		'VAR_POP',
		'VARIANCE',
		'VAR_SAMP',
		// May not apply to OVER()
		'GROUP_CONCAT',
		'GROUP_CONCAT_WS',
	],
	explicitOver: [
		'CUME_DIST', 
		'DENSE_RANK', 
		'FIRST_VALUE', 
		'LAG', 
		'LAST_VALUE', 
		'LEAD', 
		'NTH_VALUE', 
		'NTLE',
		'PERCENT_RANK',
		'RANK',
		'ROW_NUMBER',
	],
	support: [
		'ANY_VALUE', 
		'COLUMN', 
		'COLUMNS', 
		'GROUPING', 
	],
};