
/**
 * @imports
 */
import {
	CallInterface,
} from '../index.js';
import _instanceof from '@onephrase/util/js/instanceof.js';
import _isString from '@onephrase/util/js/isString.js';
import _isArray from '@onephrase/util/js/isArray.js';
import _each from '@onephrase/util/obj/each.js';
import _unique from '@onephrase/util/arr/unique.js';
import _arrFrom from '@onephrase/util/arr/from.js';
import _find from '@onephrase/util/obj/find.js';
import Lexer from '@onephrase/util/str/Lexer.js';
import ArrowReferenceInterface from '../Expr/ArrowReferenceInterface.js';
import ArrowReference from '../Expr/ArrowReference.js';
import Reference from '../Expr/Reference.js';
import Table from '../Expr/Table.js';
import Base from '../Base/Base.js';
import _Factory from '../Base/_Factory.js';

/**
 * ---------------------------
 * Delete class
 * ---------------------------
 */				

export default class Stmt {

	/**
	 * @inheritdoc
	 */
	getBase(databases, params = {}, tables = []) {
		if (!tables.length) {
			tables = (_isArray(this.exprs.table) ? this.exprs.table : [this.exprs.table]);
		}
		tables = tables.concat(this.exprs.joins || []).map(table => table.eval(databases, params));
		var main = tables.shift(), joins = tables;
		return new Base(main, joins, this.exprs.where, params);
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
	static getParse(expr, withUac, stmtClauses, parseCallback, params, callback, literalValidateCallback = null) {
		// Match clauses; case-insensitively
		var useRegex = 'i';
		var parse = Lexer.lex(expr, Object.values(stmtClauses), {useRegex:useRegex});
		if (parse.matches.length) {

			var EXPRS = {}, CLAUSES = {}, TABLES = {}, SCHEMAS = {}, VARS = [];
			parse.matches.forEach((clause, i) => {
				var clauseType = _find(stmtClauses, c => clause.match(new RegExp(c, useRegex)), true/*deep*/);
				var _expr = parse.tokens[i + 1].trim();
				var _exprParse = null;
				if (clauseType === 'joins' || clauseType.endsWith(':joins')) {
					var _exprParse = parseCallback(_expr, null, {withUac});
					if (_exprParse.type = clause.match(new RegExp('(INNER|CROSS|LEFT|RIGHT)', 'i'))) {
						_exprParse.type = _exprParse.type[0].toLowerCase();
					}
					if (!EXPRS[clauseType]) {
						EXPRS[clauseType] = [_exprParse];
						CLAUSES[clauseType] = [clause];
					} else {
						EXPRS[clauseType].push(_exprParse);
						CLAUSES[clauseType].push(clause);
					}
				} else {
					if (clauseType === 'table' || clauseType.endsWith(':table')) {
						var tables = Lexer.split(_expr, [',']).map(
							table => parseCallback(table.trim(), [Table], {withUac})
						);
						var _exprParse = tables.length === 1 ? tables[0] : tables;
					} else if (!callback || !(_exprParse = callback(clauseType, _expr))) {
						var _exprParse = parseCallback(_expr, null, {withUac});
					}
					// Ramp up
					if (clauseType === 'where' && !EXPRS.joins) {
						// Wheres must not come before joins
						// This might happen on adding smart joins below
						// So we secure a place for joins
						EXPRS.joins = [];
						CLAUSES.joins = [];
					}
					EXPRS[clauseType] = _exprParse;
					CLAUSES[clauseType] = clause;
				}
			});

			// ------------------

			(_isArray(EXPRS.table) ? EXPRS.table : [EXPRS.table]).concat((EXPRS.joins || []).map(j => j.table)).forEach((table, i) => {
				TABLES[table.getAlias()] = table;
				SCHEMAS[table.getAlias()] = table.getSchema();
				if (i === 0) {
					TABLES[''] = TABLES[table.getAlias()];
					SCHEMAS[''] = SCHEMAS[table.getAlias()];
				}
			});

			// ------------------

			var arrowReferences = [], smartJoins = {};
			_each(EXPRS, (clauseType, _exprParse) => {
				_arrFrom(_exprParse, false/*castObjects*/).reduce((_VARS, __exprParse) => _VARS.concat(__exprParse.meta.vars), VARS).forEach(_var => {
					if (_var.isContext || _var.canBeLiteral || _instanceof(_var, CallInterface)) {
						return;
					}

					// --------------

					var ref_name, ref_context;
					if (_instanceof(_var, ArrowReferenceInterface)) {
						arrowReferences.push(_var);
						if (ArrowReference.isIncoming(_var + '')) {
							return;
						}
						ref_name = _var.name.split('~>')[0].replace(/`/g, '')
					} else {
						ref_name = _var.name.replace(/`/g, '');
					}

					// -------------
					
					if (_var.context) {
						ref_context = _var.context.name.replace(/`/g, '');
						if (!SCHEMAS[ref_context] || (ref_name !== '*' && !(ref_name in SCHEMAS[ref_context].fields))) {
							throw new Error('"' + _var + '" in "' + clauseType + '" clause is unknown!');
						}
						if (ref_name === '*') {
							_var.resolved = Object.keys(SCHEMAS[ref_context].fields).map(field => parseCallback(ref_context + '.' + field, [Reference]));
						}
					} else if (ref_name === '*') {
						ref_context = SCHEMAS[''].name;
						_var.resolved = Object.keys(SCHEMAS[''].fields).map(field => parseCallback(ref_context + '.' + field, [Reference]));
					} else if (!(literalValidateCallback && literalValidateCallback(ref_name, clauseType))) {
						ref_context = Object.keys(SCHEMAS).filter(a => a).reduce((_ref_context, alias) => {
							if (ref_name in SCHEMAS[alias].fields) {
								if (_ref_context) {
									throw new Error('"' + _var + '" in "' + clauseType + '" clause is ambiguous!');
								}
								return alias;
							}
						}, null);
						if (!ref_context) {
							throw new Error('"' + _var + '" in "' + clauseType + '" clause is unknown!');
						}
						_var.resolved = parseCallback(ref_context + '.' + _var, [Reference]);
					}
				});
			});
			
			// ------------------

			if (arrowReferences.length) {
				// ---------------
				// Init
				// ---------------
				arrowReferences.forEach(arrowRef => {
					var baseTable = ArrowReference.isOutgoing(arrowRef + '') 
						? TABLES[(arrowRef.context || arrowRef.resolved.context).name + '']
						: TABLES[''];
					var arrowRefEval = ArrowReference.process(baseTable.getDatabaseName(), baseTable.getSchema(), arrowRef.name.replace(/`/g, ''));
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
				if (!EXPRS.joins) {
					EXPRS.joins = [];
					CLAUSES.joins = [];
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
					EXPRS.joins.push(joinStmt);
					CLAUSES.joins.push('LEFT JOIN');
				});

			}

			return {exprs:EXPRS, clauses:CLAUSES, TABLES, SCHEMAS};
		}
	}
};