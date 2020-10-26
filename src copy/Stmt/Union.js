
/**
 * @imports
 */
import Lexer from '@onephrase/util/str/Lexer.js';
import OrderBy from '../Expr/OrderBy.js';
import UnionInterface from './UnionInterface.js';

/**
 * ---------------------------
 * Union class
 * ---------------------------
 */				

export default class Union extends UnionInterface {
	 
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
	toString() {
		return this.stringify();
	}
	
	/**
	 * @inheritdoc
	 */
	stringify(params = {}) {
		var str = [[this.query.stringify(params)].concat(
			this.queries.map(q => (q.onDuplicate ? q.onDuplicate.toUpperCase() + ' ' : '') + q.select.stringify(params))
		).join(' UNION ')];
		if (this.orderBy) {
			str.push('ORDER BY ' + this.orderBy.stringify(params));
		}
		if (this.limit) {
			str.push('LIMIT ' + this.limit.join(', '));
		}
		return str.join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}) {
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
			return new this(
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