
/**
 * @imports
 */
import _mixin from '@onephrase/util/js/mixin.js';
import _isArray from '@onephrase/util/js/isArray.js';
import _instanceof from '@onephrase/util/js/instanceof.js';
import _arrFrom from '@onephrase/util/arr/from.js';
import _pushUnique from '@onephrase/util/arr/pushUnique.js';
import _find from '@onephrase/util/obj/find.js';
import Lexer from '@onephrase/util/str/Lexer.js';
import SelectInterface from './SelectInterface.js';
import AggrInterface from '../Expr/AggrInterface.js';
import JoinInterface from '../Expr/JoinInterface.js';
import Field from '../Expr/Field.js';
import Window from '../Expr/Window.js';
import GroupBy from '../Expr/GroupBy.js';
import OrderBy from '../Expr/OrderBy.js';
import Stmt from './Stmt.js';

/**
 * ---------------------------
 * Select class
 * ---------------------------
 */				

export default class Select extends _mixin(Stmt, SelectInterface) {
	 
	/**
	 * @inheritdoc
	 */
	constructor(exprs, clauses, withUac = false, flags = [], references = []) {
		super();
		this.exprs = exprs;
		this.clauses = clauses;
		this.withUac = withUac;
		this.flags = flags;
	}

	/**
	 * Return the SELECT STMT's Fields
	 * 
	 * @return array
	 */
	getFields(resolve = false) {
		if (!resolve) {
			return this.exprs.fields;
		}
		return this.exprs.fields.reduce((fields, field) => {
			return fields.concat(field.resolved || field);
		}, []);
	}

	/**
	 * Return the SELECT STMT's Table component
	 * 
	 * @return Object|array
	 */
	getTable() {
		return this.exprs.table;
	}

	/**
	 * Return the SELECT STMT's Table and Join components
	 * 
	 * @params Bool resolve
	 * 
	 * @return array
	 */
	getSources(resolve = false) {
		var joins = this.getJoins() || [];
		return _arrFrom(this.exprs.table, false).concat(resolve ? joins.map(j => j.table) : joins);
	}

	/**
	 * Return the SELECT STMT's Where component
	 * 
	 * @return Object
	 */
	getWhere() {
		return this.exprs.where;
	}

	/**
	 * Return the SELECT STMT's Join components
	 * 
	 * @return array
	 */
	getJoins() {
		return this.exprs.joins;
	}

	/**
	 * Return the SELECT STMT's GroupBy components
	 * 
	 * @return array
	 */
	getGroupBy() {
		return this.exprs.groupBy;
	}

	/**
	 * Return the SELECT STMT's Windows components
	 * 
	 * @return array
	 */
	getWindows() {
		return this.exprs.windows;
	}

	/**
	 * Return the SELECT STMT's OrderBy components
	 * 
	 * @return array
	 */
	getOrderBy() {
		return this.exprs.orderBy;
	}

	/**
	 * Return the SELECT STMT's Offset components
	 * 
	 * @return string
	 */
	getOffset() {
		return this.exprs.offset;
	}

	/**
	 * Return the SELECT STMT's Limit components
	 * 
	 * @return string
	 */
	getLimit() {
		return this.exprs.limit;
	}

	/**
	 * @inheritdoc
	 */
	async eval(context, params = {}) {
		
		// ---------------------------
		// INITIALIZE DATASOURCES WITH JOIN ALGORITHIMS APPLIED
		// ---------------------------
		this.base = this.getBase(context, params);
		// BUILD (TEMP) ROWS, WHERE
		var tempRows = [], tempRow;
		while ((tempRow = await this.base.fetch())) {
			tempRows.push(tempRow);
		}

		// ---------------------------
		// BUILD RESPONSE ROWS INTO THE "$" KEY
		// ---------------------------
		var applyFields = (tempRows, fields, collectAggrs = null) => {
			if (collectAggrs) {
				collectAggrs = {aggr:[], win:[]};
			}
			tempRows.forEach(tempRow => {
				if (!tempRow.$) {
					tempRow.$ = {};
				}
				fields.forEach(field => {
					if (collectAggrs) {
						// This build will ignore AGGR columns for nowthis.
						var aggrs = field.getAggrExprs();
						if (aggrs.length) {
							_pushUnique(aggrs.filter(x => x.window).length ? collectAggrs.win : collectAggrs.aggr, field);
							// But we'll set them to UNDEFINED (not NULL), to secure their slots
							if (!(field.getAlias() in tempRow.$)) {
								tempRow.$[field.getAlias()] = undefined;
							}
							return;
						}
					}
					try {
						var fieldValObject = field.eval(tempRow, context, params);
						Object.keys(fieldValObject).forEach(key => {
							Object.defineProperty(tempRow.$, key, Object.getOwnPropertyDescriptor(fieldValObject, key));
						});
					} catch(e) {
						throw new Error('["' + field.stringify() + '" in field list]: ' + e.message);
					}
				});
			});
			return collectAggrs;
		};

		// ---------------------------
		// UNDERSTAND AGGREGATIONS
		// ---------------------------
		var aggrExprs = {aggr:[], win:[]};
		this.meta.vars.forEach(x => {
			//if (_instanceof(x, AggrInterface)) {
			if (x instanceof AggrInterface) {
				_pushUnique(x.window ? aggrExprs.win : aggrExprs.aggr, x);
			}
		});
		// BUILD FIELDS
		var aggrFields = applyFields(tempRows, this.getFields(true), true/*collectAggrs*/);

		// ---------------------------
		// GROUP BY?
		// ---------------------------
		if (this.exprs.groupBy || aggrExprs.aggr.length) {
			var groupBy = this.exprs.groupBy || new GroupBy([]);
			tempRows = groupBy.eval(tempRows, params);
			// REVISIT RESPONSE ROWS and apply AGGR columns
			applyFields(tempRows, aggrFields.aggr);
		}

		// ---------------------------
		// WINDOWING
		// ---------------------------
		if (this.exprs.windows || aggrExprs.win.length) {
			var completed = [];
			aggrExprs.win.forEach(expr => {
				var uuid = expr.window.stringify();
				if (completed.indexOf(uuid) === -1) {
					expr.window.eval(tempRows, this.exprs.windows, params);
					completed.push(uuid);
				}
			});
			// REVISIT RESPONSE ROWS and apply AGGR OVER () columns
			applyFields(tempRows, aggrFields.win);
		}

		// ---------------------------
		// ORDER BY
		// ---------------------------
		if (this.exprs.orderBy) {
			tempRows = this.exprs.orderBy.eval(tempRows, params);
		}

		// ---------------------------
		// DISTINCT
		// ---------------------------
		if (this.flags.includes('DISTINCT')) {
			tempRows = tempRows.filter((tempRow, i) => i === _find(tempRows, _tempRow => _even(_tempRow, tempRow)));
		}

		// ---------------------------
		// LIMIT
		// ---------------------------
		if (this.exprs.offset || this.exprs.limit) {
			var limit = this.exprs.limit ? this.exprs.limit.slice() : [];
			var offset = this.exprs.offset || (limit.length === 2 ? limit.shift() : 0);
			tempRows = limit.length 
				? tempRows.slice(offset, offset + limit[0]) 
				: tempRows.slice(offset);
		}

		// ---------------------------
		// SEND RESPONSE ROWS
		// ---------------------------
		return tempRows.map(tempRow => tempRow.$);
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
		return this.getToString(params, (clauseType, expr, clause) => {
			if (clauseType === 'fields') {
				return clause + ' ' + (this.flags.length ? ' ' + this.flags.join(' ') : '') + expr.map(x => x.stringify(params)).join(', ');
			} else if (clauseType === 'windows') {
				return clause + ' ' + Object.keys(expr).map(
					windowName => windowName + ' AS ' + expr[windowName].stringify(params)
				).join(', ');
			} else if (clauseType === 'groupBy' || clauseType === 'orderBy') {
				return clause + ' ' + expr.stringify(params);
			} else if (clauseType === 'limit') {
				return clause + ' ' + expr.join(', ');
			}
		});
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}) {

		if (expr.trim().substr(0, 6).toLowerCase() === 'select') {
			var withUac = false;
			if (expr.match(/SELECT[ ]+WITH[ ]+UAC/i)) {
				withUac = true;
				expr = expr.replace(/[ ]+WITH[ ]+UAC/i, '');
			}
			var aliases = [];
			var stmtParse = super.getParse(expr, withUac, this.clauses, parseCallback, params, (clauseType, _expr) => {
				if (clauseType === 'fields') {
					return Lexer.split(_expr, [',']).map(field => {
						var field = parseCallback(field.trim(), [Field]);
						aliases.push(field.getAlias());
						return field;
					});
				} else if (clauseType === 'windows') {
					var windowsByName = {};
					Lexer.split(_expr, [',']).forEach(window => {
						// WINDOW w AS (PARTITION BY country ORDER BY city ASC, state DESC), u AS (...)
						// NOTICE the space around "as", important in view of "city ASC"
						var windowSplit = window.split(new RegExp(' as ', 'i'));
						windowsByName[windowSplit[0].trim()] = parseCallback(windowSplit[1].trim(), [Window]);
					});
					return windowsByName;
				} else if (clauseType === 'groupBy') {
					return parseCallback(_expr, [GroupBy]);
				} else if (clauseType === 'orderBy') {
					return parseCallback(_expr, [OrderBy]);
				} else if (clauseType === 'limit') {
					return _expr.split(',').map(n => parseInt(n));
				}
			}, (literal, clauseType) => (clauseType === 'orderBy' || clauseType === 'groupBy') && aliases.includes(literal));

			return new this(
				stmtParse.exprs, 
				stmtParse.clauses, 
				withUac,
				stmtParse.clauses.fields.replace(/SELECT/i, '').split(' ').filter(flag => flag),
				stmtParse.references,
			);
		}
	}
};

/**
 * @prop object
 */
Select.clauses = {
	fields: 'SELECT([ ]+(ALL|DISTINCT))?',
	table: 'FROM',
	where: 'WHERE',
	// INNER JOIN, CROSS JOIN, {LEFT|RIGHT} [OUTER] JOIN
	joins: '(INNER[ ]+|CROSS[ ]+|(LEFT|RIGHT)([ ]+OUTER)?[ ]+)?JOIN',
	groupBy: 'GROUP[ ]+BY',
	windows: 'WINDOW',
	orderBy: 'ORDER[ ]+BY',
	offset: 'OFFSET',
	limit: 'LIMIT',
};