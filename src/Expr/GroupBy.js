
/**
 * @imports
 */
import _inherit from '@web-native-js/commons/obj/inherit.js';
import _copy from '@web-native-js/commons/obj/copy.js';
import _after from '@web-native-js/commons/str/after.js';
import Lexer from '@web-native-js/commons/str/Lexer.js';
import GroupByInterface from './GroupByInterface.js';
import Row from '../Base/Row.js';

/**
 * ---------------------------
 * GroupBy class
 * ---------------------------
 */				

export default class GroupBy extends GroupByInterface {
	
	/**
	 * @inheritdoc
	 */
	constructor(columns, having = null, withRollup = false) {
		super();
		this.columns = columns;
		this.having = having;
		this.withRollup = withRollup;
	}
	
	/**
	 * @inheritdoc
	 */
	eval(tempRows, params = {}) {
		var groupBy = (rows, by, result) => {
			// This will end up either as
			// regular summary or rollup {super summary}
			if (by.length) {
				// Drilldown...
				var grouping = {};
				rows.forEach(row => {
					try {
						var _for = by[0].eval(row, params);
					} catch(e) {
						throw new Error('["' + this.toString() + '" in group by clause]: ' + e.message);
					}
					grouping[_for] = grouping[_for] || [];
					grouping[_for].push(row);
				});
				Object.values(grouping).map(group => groupBy(group, by.slice(1), result));
			}
			if (!by.length/*We're on end nodes*/ || this.withRollup) {
				var summaryRow = new Row(params); _inherit(summaryRow, rows[0]);
				summaryRow.$ = _copy(summaryRow.$);
				summaryRow.AGGR = {rows: rows, by: by};
				// HOW WE'LL DETERMINE A SUPER AGGREGATE ROW...
				summaryRow.AGGR.isRollup = by.length && this.withRollup;
				if (summaryRow.AGGR.isRollup) {
					by.forEach(b => {
						b = b.toString().indexOf('.') > -1 ? _after(b.toString(), '.') : b.toString();
						if (b in summaryRow.$) {
							summaryRow.$[b] = null;
						}
					});
				}
				result.push(summaryRow);
				return summaryRow;
			}
		};
		var result = [];
		groupBy(tempRows, this.columns.slice(), result);
		return result;
	}
	
	/**
	 * @inheritdoc
	 */
	toString(context = null) {
		var str = [this.columns.map(c => c.toString(context)).join(', ')];
		if (this.withRollup) {
			str.push('WITH ROLLUP');
		}
		if (this.having) {
			str.push('HAVING ' + this.having.toString(context));
		}
		return str.join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}) {
		var parse = Lexer.lex(expr, ['WITH[ ]+ROLLUP', 'HAVING'], {useRegex:'i'});
		var columns = Lexer.split(parse.tokens.shift().trim(), [',']).map(
			c => parseCallback(c.trim())
		);
		var having = null;
		var withRollup = false;
		parse.matches.forEach(clauseType => {
			if (clauseType.toLowerCase().startsWith('with')) {
				withRollup = true;
				parse.tokens.shift();
			} else if (clauseType.toLowerCase().startsWith('having')) {
				having = parseCallback(parse.tokens.shift().trim());
			}
		});
		return new this(columns, having, withRollup);
	}
};