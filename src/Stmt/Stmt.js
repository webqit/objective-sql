
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
import UACClient from '../Uac/Client.js';

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
			tables = (_isArray(this.exprs.TABLE_REFERENCES) ? this.exprs.TABLE_REFERENCES : [this.exprs.TABLE_REFERENCES]);
		}
		tables = tables.concat(this.exprs.JOIN_CLAUSE || []).map(table => table.eval(databases, params));
		var main = tables.shift(), joins = tables;
		return new Base(main, joins, this.exprs.WHERE_CLAUSE, params);
	}

	/**
	 * @inheritdoc
	 */
	getToString(params, callback) {
		// ---------------------
		var t = params.t || 0, _t = (n = 0, when = true) => !when ? '' : "\r\n" + ("\t".repeat(Math.max(0, t + n))), _params = {...params}; _params.t = t + 1;
		// ---------------------
		var strArray = [];
		_each(this.exprs, (clauseType, expr, i) => {
			if (!expr && i > 0) {
				return;
			}
			var str = null;
			if (clauseType === 'JOIN_CLAUSE') {
				var clause = this.clauses[clauseType];
				str = expr.map((join, i) => clause[i].toString().toUpperCase() + ' ' + join.stringify(_params)).join(_t());
			} else {
				var clause = this.clauses[clauseType].toString().toUpperCase();
				if (clauseType === 'TABLE_REFERENCES') {
					str = clause + ' ' + (
						_isArray(expr) ? expr.map(table => table.stringify(_params)).join(', ') : expr.stringify(_params)
					);
				} else if (!callback || !(str = callback(clauseType, expr, clause, _params, _t))) {
					if (_isArray(expr)) {
						str = expr.map(x => _isFunction(x.stringify) ? x.stringify(_params) : expr).join(', ');
					} else {
						str = clause + ' ' + expr.stringify(_params);
					}
				}
			}
			if (!str && i === 0) {
				str = clause;
			}
			if (str) {
				strArray.push(_t() + str);
			}
		});
		return strArray.join('') + _t(-1);
	}
	
	/**
	 * @inheritdoc
	 */
	static getParse(expr, withUac, stmtClauses, parseCallback, params, callback, literalValidateCallback = null) {

		var useRegex = 'i'; // Match clauses; case-insensitively
		var parse = Lexer.lex(expr, Object.values(stmtClauses), {useRegex:useRegex});
		if (parse.matches.length) {
			
			// ------------------

			var EXPRS = {}, CLAUSES = {}, TABLES = {}, SCHEMAS = {}, VARS = [];
			parse.matches.forEach((clause, i) => {
				var clauseType = _find(stmtClauses, c => clause.match(new RegExp(c, useRegex)), true/*deep*/);
				var _expr = parse.tokens[i + 1].trim();
				var _exprParse = null;
				if (clauseType === 'JOIN_CLAUSE') {
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
					if (clauseType === 'TABLE_REFERENCES' || clauseType === 'USING_CLAUSE'/* specific to the DELETE stmt */) {
						var tables = Lexer.split(_expr, [',']).map(
							table => parseCallback(table.trim(), [Table], {withUac, assertTableValidity: clauseType === 'TABLE_REFERENCES' && !parse.matches.includes('USING')})
						);
						var _exprParse = tables.length === 1 ? tables[0] : tables;
					} else if (!callback || !(_exprParse = callback(clauseType, _expr))) {
						var _exprParse = parseCallback(_expr, null, {withUac});
					}
					// Ramp up
					if (clauseType === 'WHERE_CLAUSE' && !EXPRS.JOIN_CLAUSE) {
						// Wheres must not come before joins
						// This might happen on adding smart joins below
						// So we secure a place for joins
						EXPRS.JOIN_CLAUSE = [];
						CLAUSES.JOIN_CLAUSE = [];
					}
					EXPRS[clauseType] = _exprParse;
					CLAUSES[clauseType] = clause;
				}
			});

			// ------------------

			const TABLE_REFERENCES = EXPRS.USING_CLAUSE/* specific to the DELETE stmt */ || EXPRS.TABLE_REFERENCES;
			(_isArray(TABLE_REFERENCES) ? TABLE_REFERENCES : [TABLE_REFERENCES]).concat((EXPRS.JOIN_CLAUSE || []).map(j => j.table)).forEach((table, i) => {
				var tableAlias = table.getAlias(), tableSchema = table.getSchema();
				TABLES[tableAlias] = table;
				SCHEMAS[tableAlias] = tableSchema;
				if (i === 0) {
					TABLES[''] = TABLES[tableAlias];
					SCHEMAS[''] = SCHEMAS[tableAlias];
				}
			});

			// ------------------

			_each(EXPRS, (clauseType, _exprParse) => {
				_arrFrom(_exprParse, false/*castObjects*/).reduce((_VARS, __exprParse) => _VARS.concat(__exprParse.meta.vars).concat(__exprParse.meta.varsUnlodged), []).forEach(_var => {
					if (!(_var.role === 'CONTEXT')) {
						VARS.push(_var);
					}
					if (_var.role === 'CONTEXT' || _instanceof(_var, CallInterface)) {
						return;
					}
					// --------------
					var ref_name, ref_context;
					if (_instanceof(_var, ArrowReferenceInterface)) {
						if (ArrowReference.isIncoming(_var + '')) {
							if (_var.context) {
								TABLES[_var.context + ''].associateReference(_var);
							} else {
								_var.interpreted = parseCallback(TABLES[''].getAlias() + '.' + _var, [Reference]);
								TABLES[''].associateReference(_var);
							}
							return;
						}
						ref_name = _var.name.split('~>')[0].replace(/`/g, '');
					} else {
						ref_name = _var.name.replace(/`/g, '');
					}
					// -------------
					if (_var.context) {
						ref_context = _var.context.name.replace(/`/g, '');
						if (!SCHEMAS[ref_context] || (ref_name !== '*' && !(ref_name in SCHEMAS[ref_context].fields))) {
							// Qualified, but unknown column name!
							if (params.validation !== false) {
								// Throw
								throw new Error('"' + _var + '" in ' + clauseType.replace(/_/g, ' ') + ' is unknown!');
							}
							// Or use as is
						}
						if (ref_name === '*') {
							_var.interpreted = Object.keys(SCHEMAS[ref_context].fields).map(field => parseCallback(ref_context + '.' + field, [Reference]));
						}
					} else if (ref_name === '*') {
						ref_context = TABLES[''].getAlias();
						var impliedFields;
						if ((impliedFields = Object.keys(SCHEMAS[''].fields)) && !impliedFields.length) {
							// Throw
							throw new Error('The wildcard column specifier (*) cannot used on table "' + ref_context + '"; table defines no columns.');
						}
						_var.interpreted = impliedFields.map(field => parseCallback(ref_context + '.' + field, [Reference]));
					} else if (!(literalValidateCallback && literalValidateCallback(ref_name, clauseType))) {
						ref_context = Object.keys(SCHEMAS).filter(a => a).reduce((_ref_context, alias) => {
							if (ref_name in SCHEMAS[alias].fields) {
								if (_ref_context) {
									// Ambiguous column name!
									if (params.validation !== false) {
										// Throw
										throw new Error('"' + _var + '" in ' + clauseType.replace(/_/g, ' ') + ' is ambiguous!');
									}
									// Use first context found
									return _ref_context;
								}
								return alias;
							}
						}, null);
						if (!ref_context) {
							// Unqualified, unknown column name!
							if (params.validation !== false) {
								// Throw
								throw new Error('"' + _var + '" in ' + clauseType.replace(/_/g, ' ') + ' is unknown!');
							} else {
								// Force the column on main table
								ref_context = TABLES[''].getAlias(), impliedFields;
							}
						}
						_var.interpreted = parseCallback(ref_context + '.' + _var, [Reference]);
					}
					// ------------------
					TABLES[ref_context || ''].associateReference(_var);
				});
			});
			
			// ------------------

			_each(TABLES, (alias, table) => {
				if (!alias) {
					return;
				}
				var tableName = table.getName();
				// -----------
				if (params.withUac && !table.isDerivedQuery()/* Then UAC would already be applied */) {
					table.interpreted = parseCallback('(' + UACClient.select(params, SCHEMAS[alias], null/* USER */, table.getAssociateReferences().map(ref => ref.name)/* columns */) + ') AS ' + (alias || tableName), [Table], {withUac: false});
				}
				// -----------
				var arrowReferences;
				if ((arrowReferences = table.getAssociateReferences().filter(ref => _instanceof(ref, ArrowReferenceInterface))).length) {
					var joins = {},
						_joins = [],
						_select = table.getAssociateReferences().filter(ref => !_instanceof(ref, ArrowReferenceInterface)).map(ref => tableName + '.' + ref.name);
					// ----------
					arrowReferences.forEach(ref => {
						var join = ref.process(SCHEMAS[alias], params.DB_FACTORY);
						var joinUUID = join.b.table.name + '__by__' + join.b.actingKey;
						if (!joins[joinUUID]) {
							joins[joinUUID] = join
						}
						_select.push(joinUUID + '.' + join.b.select + ' AS `' + ref.name.replace(/`/g, '') + '`');
					});
					// ----------
					_each(joins, (joinUUID, join) => {
						_joins.push('LEFT JOIN ' + join.b.table.name + ' AS ' + joinUUID + ' ON ' + joinUUID + '.' + join.b.actingKey + ' = ' + tableName + '.' + join.a.actingKey);
					});
					// ----------
					var stmt = '(SELECT' + (withUac ? ' WITH UAC' : '') 
						+ ' ' + _unique(_select).join(', ') 
						+ ' FROM ' + tableName
						+ ' ' + _joins.join(' ') 
						+ ') AS ' + table.getAlias();
					(table.interpreted/* possibly by UAC evaluation */ || table).interpreted = parseCallback(stmt, [Table], {withUac});
				}
			});
			
			// ------------------

			return {exprs:EXPRS, clauses:CLAUSES, tables:TABLES, schemas:SCHEMAS, vars:VARS};
		}
	}
};