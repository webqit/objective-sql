
/**
 * @imports
 */
import {Lexer} from '../index.js';
import OrderBy from './OrderBy.js';
import UnionInterface from './UnionInterface.js';

/**
 * ---------------------------
 * Union class
 * ---------------------------
 */				

const Union = class extends UnionInterface {
	 
	/**
	 * @inheritdoc
	 */
	constructor(query, queries, orderBy = null, limit = null) {
		super();
		this.query = query;
		this.queries = queries;
		this.orderBy = orderBy;
		this.limit = limit;
	}
	
	/**
	 * @inheritdoc
	 */
	toString(context = null) {
		var str = [[this.query.toString(context)].concat(
			this.queries.map(q => (q.onDuplicate ? q.onDuplicate.toUpperCase() + ' ' : '') + q.select.toString(context))
		).join(' UNION ')];
		if (this.orderBy) {
			str.push('ORDER BY ' + this.orderBy.toString(context));
		}
		if (this.limit) {
			str.push('LIMIT ' + this.limit.join(', '));
		}
		return str.join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}, Static = Union) {
		var parse = null;
		var paramsRegex = {useRegex: 'i'};
		if ((parse = Lexer.lex(expr, [' UNION([ ]+(ALL|DISTINCT))? '], paramsRegex)) && parse.matches.length) {
			var selects = parse.tokens;
			var clauses = parse.matches;
			var orderBy = null;
			var limit = null;
			// Are the selects parenthisized? Then there could be outer ORDER BY / LIMIT clauses
			if (selects[0].trim().startsWith('(')) {
				var lastStmtSplit = Lexer.lex(selects.pop(), ['ORDER[ ]+BY', 'LIMIT'], paramsRegex);
				selects.push(lastStmtSplit.tokens.shift());
				lastStmtSplit.matches.forEach(clause => {
					var _expr = lastStmtSplit.tokens.shift().trim();
					if (clause.toUpperCase().startsWith('ORDER')) {
						orderBy = parseCallback(_expr, [OrderBy]);
					} else if (clause.toUpperCase().startsWith('LIMIT')) {
						limit = _expr.split(',').map(n => parseInt(n));
					}
				});
			}
			return new Static(
				parseCallback(selects.shift().trim()),
				selects.map((select, i) => {return {
					select: parseCallback(select.trim()),
					onDuplicate: (clauses[i].match(new RegExp('ALL|DISTINCT', 'i')) || [])[0]
				}}),
				orderBy,
				limit
			);
		}
	}
};

/**
 * @exports
 */
export default Union;
