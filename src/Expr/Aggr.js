
/**
 * @imports
 */
import {
	Lexer
} from '../index.js';
import _mixin from '@web-native-js/commons/js/mixin.js';
import _flatten from '@web-native-js/commons/arr/flatten.js';
import _find from '@web-native-js/commons/obj/find.js';
import _before from '@web-native-js/commons/str/before.js';
import AggrInterface from './AggrInterface.js';
import Window from './Window.js';
import Call from './Call.js';

/**
 * ---------------------------
 * Aggr class
 * ---------------------------
 */				
const Aggr = class extends _mixin(Call, AggrInterface) {

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
	eval(context, trap = {}) {
		var args = this.args.list.slice();
		args.unshift(this.window ? context.WINDOWS[this.window.toString()] : context.AGGR.rows);
		return this.evalWithArgs(context, args, trap);
	}
	
	/**
	 * @inheritdoc
	 */
	toString(context = null) {
		return super.toString(context) + (this.window ? ' OVER ' + this.window.toString(context) : '');
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, Static = Aggr) {
		var aggrMatch = null;
		var aggrMatchRegex = _flatten(Static.funcs).join("\\(|") + "\\(";
		if (aggrMatch = expr.trim().match(new RegExp('^(' + aggrMatchRegex + ')', 'i'))) {
			var funcName = _before(aggrMatch[0], '(').toUpperCase();
			var funcCategory = _find(Static.funcs, val => val === funcName, true)[0];
			var splits = Lexer.split(expr, ['OVER'], {ci:true});
			if (funcCategory === 'explicitOver' && splits.length === 1) {
				throw new Error(aggrMatch[0] + '() requires an OVER clause!');
			}
			var instance = super.parse(splits.shift().trim(), parseCallback, Static);
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

/**
 * @exports
 */
export default Aggr;
