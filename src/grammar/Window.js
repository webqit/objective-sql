
/**
 * @imports
 */
import _inherit from '@webqit/util/obj/inherit.js';
import _wrapped from '@webqit/util/str/wrapped.js';
import _unwrap from '@webqit/util/str/unwrap.js';
import Lexer from '@webqit/util/str/Lexer.js';
import WindowInterface from './WindowInterface.js';
import OrderBy from './OrderBy.js';

/**
 * ---------------------------
 * Window class
 * ---------------------------
 */				

export default class Window extends WindowInterface {
	
	/**
	 * @inheritdoc
	 */
	constructor(dfn) {
		super();
		this.dfn = dfn;
	}
	
	/**
	 * @inheritdoc
	 */
	eval(tempRows, definitions = {}, params = {}) {
		var dfn = this.dfn;
		var uuid = this.stringify();
		if (this.dfn.name) {
			if (!definitions || !definitions[this.dfn.name]) {
				throw new Error('Window name "' + this.dfn.name + '" is undefined!');
			}
			dfn = _inherit({}, this.dfn, definitions[this.dfn.name]);
		}
		var exec = (rows, partitionBy) => {
			if (partitionBy.length) {
				// Drilldown...
				var partitioning = {};
				rows.forEach(row => {
					var _for = partitionBy[0].eval(row, params);
					partitioning[_for] = partitioning[_for] || [];
					partitioning[_for].push(row);
				});
				Object.values(partitioning).map(partition => exec(partition, partitionBy.slice(1)));
			} else {
				if (dfn.orderBy) {
					rows = dfn.orderBy.eval(rows, params);
				}
				rows.forEach(row => {
					if (!row.WINDOWS) {
						row.WINDOWS = {};
					}
					row.WINDOWS[uuid] = rows;
				});
			}
		};
		try {
			exec(tempRows, dfn.partitionBy || []);
		} catch(e) {
			throw new Error('["' + this.stringify() + '" in window definition]: ' + e.message);
		}
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
		var length = Object.keys(this.dfn).length;
		if (length === 1 && this.dfn.name) {
			return this.dfn.name;
		}
		var str = [this.dfn.name];
		if (this.dfn.partitionBy) {
			str.push('PARTITION BY ' + this.dfn.partitionBy.map(expr => expr.stringify(params)).join(', '));
		}
		if (this.dfn.orderBy) {
			str.push('ORDER BY ' + this.dfn.orderBy.stringify(params));
		}
		return '(' + str.filter(a => a).join(' ') + ')';
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}) {
		var dfn = {};
		if (_wrapped(expr, '(', ')')) {
			if (expr = _unwrap(expr, '(', ')')) {
				var parse = Lexer.lex(expr, ['PARTITION[ ]+BY', 'ORDER[ ]+BY'], {useRegex:'i'});
				dfn.name = parse.tokens.shift().trim();
				parse.matches.forEach(clauseType => {
					if (clauseType.toLowerCase().startsWith('partition')) {
						dfn.partitionBy = Lexer.split(parse.tokens.shift().trim(), [','])
							.map(expr => parseCallback(expr));
					} else if (clauseType.toLowerCase().startsWith('order')) {
						dfn.orderBy = parseCallback(parse.tokens.shift().trim(), [OrderBy]);
					}
				});
			}
		} else {
			dfn.name = expr;
		}
		return new this(dfn);
	}
}