
/**
 * @imports
 */
import {
	AbstractionInterface,
} from '../index.js';
import _instanceof from '@onephrase/util/js/instanceof.js';
import _isArray from '@onephrase/util/js/isArray.js';
import _each from '@onephrase/util/obj/each.js';
import _unique from '@onephrase/util/arr/unique.js';
import _arrFrom from '@onephrase/util/arr/from.js';
import _find from '@onephrase/util/obj/find.js';
import Lexer from '@onephrase/util/str/Lexer.js';
import ArrowReference from '../ArrowReference.js';
import Table from '../Expr/Table.js';
import Base from '../Base/Base.js';

/**
 * ---------------------------
 * Delete class
 * ---------------------------
 */				

export default class Stmt {

	/**
	 * @inheritdoc
	 */
	getBase(database, params = {}) {
		var tables = (_isArray(this.exprs.table) ? this.exprs.table : [this.exprs.table]).concat(this.exprs.joins || []);
		tables = tables.map(table => table.eval(database, params));
		var mainTable = tables.shift();
		return new Base(params, mainTable, this.exprs.where, ...tables);
	}

	/**
	 * @inheritdoc
	 */
	getToString(context, callback) {
		var strArray = [];
		_each(this.exprs, (clauseType, expr) => {
			if (!expr) {
				return;
			}
			var str = null;
			var clause = this.clauses[clauseType];
			if (clauseType === 'joins') {
				str = expr.map((join, i) => clause[i] + ' ' + join.toString(context)).join(' ');
			} else if (clauseType === 'table') {
				str = clause + ' ' + (
					_isArray(expr) ? expr.map(table => table.toString(context)).join(', ') : expr.toString(context)
				);
			} else if (!callback || !(str = callback(clauseType, expr, clause))) {
				str = clause + ' ' + expr.toString(context);
			}
			strArray.push(str);
		});
		return strArray.join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static getParse(expr, withUac, stmtClauses, parseCallback, params, callback) {
		// Match clauses; case-insensitively
		var useRegex = 'i';
		var parse = Lexer.lex(expr, Object.values(stmtClauses), {useRegex:useRegex});
		if (parse.matches.length) {

			var exprs = {}, clauses = {}, vars = [];
			parse.matches.forEach((clause, i) => {
				var clauseType = _find(stmtClauses, c => clause.match(new RegExp(c, useRegex)), true/*deep*/);
				var _expr = parse.tokens[i + 1].trim();
				var _exprParse = null;
				if (clauseType === 'joins') {
					var _exprParse = parseCallback(_expr, null, {withUac});
					if (_exprParse.type = clause.match(new RegExp('(INNER|CROSS|LEFT|RIGHT)', 'i'))) {
						_exprParse.type = _exprParse.type[0].toLowerCase();
					}
					if (!exprs[clauseType]) {
						exprs[clauseType] = [_exprParse];
						clauses[clauseType] = [clause];
					} else {
						exprs[clauseType].push(_exprParse);
						clauses[clauseType].push(clause);
					}
				} else {
					if (clauseType === 'table') {
						var tables = Lexer.split(_expr, [',']).map(
							table => parseCallback(table.trim(), [Table], {withUac})
						);
						var _exprParse = tables.length === 1 ? tables[0] : tables;
					} else if (!callback || !(_exprParse = callback(clauseType, _expr))) {
						var _exprParse = parseCallback(_expr, null, {withUac});
					}
					if (!_instanceof(_exprParse, AbstractionInterface)) {
						// Mine vars
						_arrFrom(_exprParse, false/*castObjects*/).forEach(__exprParse => {
							vars = vars.concat(__exprParse.meta.vars.filter(v => !v.isTableName));
						});
					}
					// Ramp up
					if (clauseType === 'where' && !exprs.joins) {
						// Wheres must not come before joins
						// This might happen on adding smart joins below
						// So we secure a place for joins
						exprs.joins = [];
						clauses.joins = [];
					}
					exprs[clauseType] = _exprParse;
					clauses[clauseType] = clause;
				}
			});

			// ------------------

			var arrowReferences = vars.filter(v => v.isArrowReference);
			if (arrowReferences.length) {
				// ---------------
				// Init
				// ---------------
				var smartJoins = {}, tables = (_isArray(exprs.table) ? exprs.table : [exprs.table]).concat(exprs.joins || []);
				arrowReferences.forEach(arrowRef => {
					var baseTable = (arrowRef.context ? tables.filter(table => table.getAlias() === arrowRef.context.name + '') : tables)[0];
					var arrowRefEval = ArrowReference.eval(baseTable.getDatabaseName(params), baseTable.getSchema(params), arrowRef.name.replace(/`/g, ''));
					var uuid = [baseTable.getAlias(), arrowRefEval.a.actingKey, arrowRefEval.b.actingKey, arrowRefEval.b.table.name,].join('_');
					if (!smartJoins[uuid]) {
						smartJoins[uuid] = {
							a: arrowRefEval.a,
							b: arrowRefEval.b,
							select: [],
							baseTable,
						}
					}
					// The actual table to resolve from
					// id thid joined table
					arrowRef.arrowContext = uuid;
					smartJoins[uuid].select.push(
						arrowRefEval.b.actingKey, // Must come first
						arrowRefEval.b.select + ' AS `' + arrowRef.name.replace(/`/g, '') + '`'
					);
				});
				// ---------------
				// Use
				// ---------------
				if (!exprs.joins) {
					exprs.joins = [];
					clauses.joins = [];
				}
				_each(smartJoins, (uuid, join) => {
					var alias = join.b.table.name;
					// ------------------
					var joinStmt = '(SELECT ' + (withUac ? 'WITH UAC ' : '') + alias + '.' + _unique(join.select).join(', ' + alias + '.') 
						+ ' FROM ' + join.b.table.name + ' AS ' + alias
					+ ') AS ' + uuid
					+ ' ON ' + uuid + '.' + join.b.actingKey + ' = ' + join.baseTable.getAlias() + '.' + join.a.actingKey;
					joinStmt = parseCallback(joinStmt);
					joinStmt.type = 'left';
					// ------------------
					exprs.joins.push(joinStmt);
					clauses.joins.push('LEFT JOIN');
				});

			}
			return {exprs:exprs, clauses:clauses};
		}
	}
};