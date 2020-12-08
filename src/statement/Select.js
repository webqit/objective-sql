
/**
 * @imports
 */
import _mixin from '@webqit/util/js/mixin.js';
import _isArray from '@webqit/util/js/isArray.js';
import _arrFrom from '@webqit/util/arr/from.js';
import _pushUnique from '@webqit/util/arr/pushUnique.js';
import _find from '@webqit/util/obj/find.js';
import Lexer from '@webqit/util/str/Lexer.js';
import SelectInterface from './SelectInterface.js';
import AggrInterface from '../grammar/AggrInterface.js';
import Field from '../grammar/Field.js';
import Window from '../grammar/Window.js';
import GroupBy from '../grammar/GroupBy.js';
import OrderBy from '../grammar/OrderBy.js';
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
	constructor(exprs, clauses, withUac = false, flags = [], vars = []) {
		super();
		this.exprs = exprs;
		this.clauses = clauses;
		this.withUac = withUac;
		this.flags = flags;
		this.vars = vars;
	}

	/**
	 * Return the SELECT STMT's Fields
	 * 
	 * @return array
	 */
	getFields(resolve = false) {
		return this.exprs.SELECT_LIST;
	}

	/**
	 * Return the SELECT STMT's Table component
	 * 
	 * @return Object|array
	 */
	getTable() {
		return this.exprs.TABLE_REFERENCES;
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
		return _arrFrom(this.exprs.TABLE_REFERENCES, false).concat(resolve ? joins.map(j => j.table) : joins);
	}

	/**
	 * Return the SELECT STMT's Where component
	 * 
	 * @return Object
	 */
	getWhere() {
		return this.exprs.WHERE_CLAUSE;
	}

	/**
	 * Return the SELECT STMT's Join components
	 * 
	 * @return array
	 */
	getJoins() {
		return this.exprs.JOIN_CLAUSE;
	}

	/**
	 * Return the SELECT STMT's GroupBy components
	 * 
	 * @return array
	 */
	getGroupBy() {
		return this.exprs.GROUP_BY_CLAUSE;
	}

	/**
	 * Return the SELECT STMT's Windows components
	 * 
	 * @return array
	 */
	getWindows() {
		return this.exprs.WINDOWS_CLAUSE;
	}

	/**
	 * Return the SELECT STMT's OrderBy components
	 * 
	 * @return array
	 */
	getOrderBy() {
		return this.exprs.ORDER_BY_CLAUSE;
	}

	/**
	 * Return the SELECT STMT's Offset components
	 * 
	 * @return string
	 */
	getOffset() {
		return this.exprs.OFFSET_CLAUSE;
	}

	/**
	 * Return the SELECT STMT's Limit components
	 * 
	 * @return string
	 */
	getLimit() {
		return this.exprs.LIMIT_CLAUSE;
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
		while (tempRow = await this.base.fetch()) {
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
					var fieldValObject = field.eval(tempRow, context, params);
					Object.keys(fieldValObject).forEach(key => {
						Object.defineProperty(tempRow.$, key, Object.getOwnPropertyDescriptor(fieldValObject, key));
					});
				});
			});
			return collectAggrs;
		};

		// ---------------------------
		// UNDERSTAND AGGREGATIONS
		// ---------------------------
		var aggrExprs = {aggr:[], win:[]};
		this.vars.forEach(x => {
			//if (x instanceof AggrInterface) {
			if (x instanceof AggrInterface) {
				_pushUnique(x.window ? aggrExprs.win : aggrExprs.aggr, x);
			}
		});
		// BUILD FIELDS
		var aggrFields = applyFields(tempRows, this.getFields(), true/*collectAggrs*/);

		// ---------------------------
		// GROUP BY?
		// ---------------------------
		if (this.exprs.GROUP_BY_CLAUSE || aggrExprs.aggr.length) {
			var groupBy = this.exprs.GROUP_BY_CLAUSE || new GroupBy([]);
			tempRows = groupBy.eval(tempRows, params);
			// REVISIT RESPONSE ROWS and apply AGGR columns
			applyFields(tempRows, aggrFields.aggr);
		}

		// ---------------------------
		// WINDOWING
		// ---------------------------
		if (this.exprs.WINDOWS_CLAUSE || aggrExprs.win.length) {
			var completed = [];
			aggrExprs.win.forEach(expr => {
				var uuid = expr.window.stringify();
				if (completed.indexOf(uuid) === -1) {
					expr.window.eval(tempRows, this.exprs.WINDOWS_CLAUSE, params);
					completed.push(uuid);
				}
			});
			// REVISIT RESPONSE ROWS and apply AGGR OVER () columns
			applyFields(tempRows, aggrFields.win);
		}

		// ---------------------------
		// ORDER BY
		// ---------------------------
		if (this.exprs.ORDER_BY_CLAUSE) {
			tempRows = this.exprs.ORDER_BY_CLAUSE.eval(tempRows, params);
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
		if (this.exprs.OFFSET_CLAUSE || this.exprs.LIMIT_CLAUSE) {
			var limit = this.exprs.LIMIT_CLAUSE ? this.exprs.LIMIT_CLAUSE.slice() : [];
			var offset = this.exprs.OFFSET_CLAUSE || (limit.length === 2 ? limit.shift() : 0);
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
		return this.getToString(params, (clauseType, expr, clause, _params) => {
			if (clauseType === 'SELECT_LIST') {
				return clause + ' ' + /*(this.flags.length ? ' ' + this.flags.join(' ') + ' ' : '') +*/ expr.map(x => x.stringify(_params)).join(', ');
			} else if (clauseType === 'WINDOWS_CLAUSE') {
				return clause + ' ' + Object.keys(expr).map(
					windowName => windowName + ' AS ' + expr[windowName].stringify(_params)
				).join(', ');
			} else if (clauseType === 'GROUP_BY_CLAUSE' || clauseType === 'ORDER_BY_CLAUSE') {
				return clause + ' ' + expr.stringify(_params);
			} else if (clauseType === 'LIMIT_CLAUSE') {
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
				if (clauseType === 'SELECT_LIST') {
					return Lexer.split(_expr, [',']).map(field => {
						var field = parseCallback(field.trim(), [Field]);
						aliases.push(field.getAlias());
						return field;
					});
				} else if (clauseType === 'WINDOWS_CLAUSE') {
					var windowsByName = {};
					Lexer.split(_expr, [',']).forEach(window => {
						// WINDOW w AS (PARTITION BY country ORDER BY city ASC, state DESC), u AS (...)
						// NOTICE the space around "as", important in view of "city ASC"
						var windowSplit = window.split(new RegExp(' as ', 'i'));
						windowsByName[windowSplit[0].trim()] = parseCallback(windowSplit[1].trim(), [Window]);
					});
					return windowsByName;
				} else if (clauseType === 'GROUP_BY_CLAUSE') {
					return parseCallback(_expr, [GroupBy]);
				} else if (clauseType === 'ORDER_BY_CLAUSE') {
					return parseCallback(_expr, [OrderBy]);
				} else if (clauseType === 'LIMIT_CLAUSE') {
					return _expr.split(',').map(n => parseInt(n));
				}
			}, (literal, clauseType) => (clauseType === 'ORDER_BY_CLAUSE' || clauseType === 'GROUP_BY_CLAUSE') && aliases.includes(literal));

			return new this(
				stmtParse.exprs, 
				stmtParse.clauses, 
				withUac,
				stmtParse.clauses.SELECT_LIST.replace(/SELECT/i, '').split(' ').filter(flag => flag),
				stmtParse.vars,
			);
		}
	}
};

/**
 * @prop object
 */
Select.clauses = {
	SELECT_LIST: 'SELECT([ ]+(ALL|DISTINCT))?',
	TABLE_REFERENCES: 'FROM',
	WHERE_CLAUSE: 'WHERE',
	// INNER JOIN, CROSS JOIN, {LEFT|RIGHT} [OUTER] JOIN
	JOIN_CLAUSE: '(INNER[ ]+|CROSS[ ]+|(LEFT|RIGHT)([ ]+OUTER)?[ ]+)?JOIN',
	GROUP_BY_CLAUSE: 'GROUP[ ]+BY',
	WINDOWS_CLAUSE: 'WINDOW',
	ORDER_BY_CLAUSE: 'ORDER[ ]+BY',
	OFFSET_CLAUSE: 'OFFSET',
	LIMIT_CLAUSE: 'LIMIT',
};