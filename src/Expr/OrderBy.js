
/**
 * @imports
 */
import {
	Lexer
} from '../index.js';
import _sort from '@web-native-js/commons/arr/sort.js';
import _before from '@web-native-js/commons/str/before.js';
import _beforeLast from '@web-native-js/commons/str/beforeLast.js';
import OrderByInterface from './OrderByInterface.js';

/**
 * ---------------------------
 * OrderBy class
 * ---------------------------
 */				

const OrderBy = class extends OrderByInterface {
	
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
	eval(tempRows, trap = {}) {
		var order = (rows, by) => {
			// Drilldown...
			var grouping = {};
			rows.forEach(row => {
				var _for = by[0].expr.eval(row, trap);
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
		try {
			var ordering = order(tempRows, this.columns);
		} catch(e) {
			throw new Error('["' + this.toString() + '" in order by clause]: ' + e.message);
		}
		return ordering;
	}
	
	/**
	 * @inheritdoc
	 */
	toString(context = null) {
		var str = [this.columns.map(
			c => c.expr.toString(context) + (c.order ? ' ' + c.order : '')
		).join(', ')];
		if (this.withRollup) {
			str.push('WITH ROLLUP');
		}
		return str.join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}, Static = OrderBy) {
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
		return new Static(columns, withRollup);
	}
};

/**
 * @exports
 */
export default OrderBy;
