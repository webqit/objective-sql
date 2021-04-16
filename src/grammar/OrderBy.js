
/**
 * @imports
 */
import _sort from '@webqit/util/arr/sort.js';
import _before from '@webqit/util/str/before.js';
import _beforeLast from '@webqit/util/str/beforeLast.js';
import Lexer from '@webqit/util/str/Lexer.js';
import OrderByInterface from './OrderByInterface.js';

/**
 * ---------------------------
 * OrderBy class
 * ---------------------------
 */				

export default class OrderBy extends OrderByInterface {
	
	/**
	 * @inheritdoc
	 */
	constructor(columns, withRollup = false) {
		super();
		this.columns = columns;
		this.withRollup = withRollup;
	}
	
	/**
	 * @inheritdoc
	 */
	eval(tempRows, params = {}) {
		var order = (rows, by) => {
			// Drilldown...
			var grouping = {};
			rows.forEach(row => {
				var _for = by[0].expr.eval(row, params);
				grouping[_for] = grouping[_for] || [];
				grouping[_for].push(row);
			});
			// Get esults flattened
			var result = [];
			_sort(Object.keys(grouping), by[0].order).forEach(_for => {
				result = result.concat(by.length > 1 ? order(grouping[_for], by.slice(1)) : grouping[_for]);
			});
			return result;
		};
		return order(tempRows, this.columns);
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
		var str = [this.columns.map(
			c => c.expr.stringify(params) + (c.order ? ' ' + c.order : '')
		).join(', ')];
		if (this.withRollup) {
			str.push('WITH ROLLUP');
		}
		return str.join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}) {
		var columns = [];
		var withRollup = false;
		var parse = Lexer.lex(expr, ['WITH[ ]+ROLLUP'], {useRegex:'i'});
		columns = Lexer.split(parse.tokens.shift().trim(), [',']).map(c => {
			var order = c.match(/ASC|DESC/, 'i');
			if (order) {
				order = order[0];
				c = _beforeLast(c, order).trim();
			}
			return {expr:parseCallback(c), order:order};
		});
		if (parse.matches.length === 1) {
			withRollup = true;
		}
		return new this(columns, withRollup);
	}
}