
/**
 * @imports
 */
import _mixin from '@webqit/util/js/mixin.js';
import _flatten from '@webqit/util/arr/flatten.js';
import _find from '@webqit/util/obj/find.js';
import _before from '@webqit/util/str/before.js';
import _after from '@webqit/util/str/after.js';
import Lexer from '@webqit/util/str/Lexer.js';
import Call from './Call.js';
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
	eval(context, params = {}) {
		var args = this.args.list.slice();
		args.unshift(this.window ? context.WINDOWS[this.window.stringify()] : context.AGGR.rows, this.aggrFlag);
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
		var str = super.stringify(params);
		if (this.aggrFlag) {
			str = str.replace('(', '(' + this.aggrFlag + ' ');
		}
		return str + (this.window ? ' OVER ' + this.window.stringify(params) : '');
	}
	
	/**
	 * @inheritdoc
	 */
	static async parse(expr, parseCallback, params = {}) {
		var aggrMatch, funcFlagMatch, aggrFlag = '';
		var aggrMatchRegex = _flatten(this.funcs).join("\\(|") + "\\(";
		if (aggrMatch = expr.trim().match(new RegExp('^(' + aggrMatchRegex + ')', 'i'))) {
			var funcName = _before(aggrMatch[0], '(').toUpperCase();
			var funcFlagStart = _after(expr, funcName + '(');
			if (funcFlagMatch = funcFlagStart.match(new RegExp('^(([ ]+)?' + ['ALL', 'DISTINCT'].join('[ ]+|([ ]+)?') + '[ ]+)', 'i'))) {
				aggrFlag = funcFlagMatch[0];
				expr = expr.replace(aggrFlag, '');
			}
			var funcCategory = _find(this.funcs, val => val === funcName, true)[0];
			var splits = Lexer.split(expr, ['OVER'], {ci:true});
			if (funcCategory === 'explicitOver' && splits.length === 1) {
				throw new Error(aggrMatch[0] + '() requires an OVER clause!');
			}
			var instance = await super.parse(splits.shift().trim(), parseCallback, params);
			instance.funcCategory = funcCategory;
			instance.aggrFlag = aggrFlag.trim();
			if (splits.length) {
				instance.window = await parseCallback(splits.pop().trim(), [Window]);
			}
			return instance;
		}
	}
}

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