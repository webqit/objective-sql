
/**
 * @imports
 */
import {
	Lexer
} from '../index.js';
import _mixin from '@web-native-js/commons/js/mixin.js';
import _isArray from '@web-native-js/commons/js/isArray.js';
import _arrFrom from '@web-native-js/commons/arr/from.js';
import _pushUnique from '@web-native-js/commons/arr/pushUnique.js';
import _merge from '@web-native-js/commons/obj/merge.js';
import _find from '@web-native-js/commons/obj/find.js';
import SelectInterface from './SelectInterface.js';
import AggrInterface from './AggrInterface.js';
import Field from './Field.js';
import Stmt from './Stmt.js';
import Window from './Window.js';
import GroupBy from './GroupBy.js';
import OrderBy from './OrderBy.js';
import Base from '../Base/Base.js';

/**
 * ---------------------------
 * Select class
 * ---------------------------
 */				

const Select = class extends _mixin(Stmt, SelectInterface) {
	 
	/**
	 * @inheritdoc
	 */
	constructor(exprs, clauses, distinct = false, references = []) {
		super();
		this.exprs = exprs;
		this.clauses = clauses;
		this.distinct = distinct;
	}

	/**
	 * Return the SELECT STMT's Fields
	 * 
	 * @return array
	 */
	getFields() {
		return this.exprs.fields;
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
	eval(database, trap = {}) {
		// ---------------------------
		// UNDERSTAND AGGREGATIONS
		// ---------------------------
		var aggrExprs = {aggr:[], win:[]};
		this.meta.vars.forEach(x => {
			if (x instanceof AggrInterface) {
				_pushUnique(x.window ? aggrExprs.win : aggrExprs.aggr, x);
			}
		});

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
						var aggrs = field.expr.meta.vars.slice().concat([field.expr]).filter(x => x instanceof AggrInterface);
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
						_merge(1, tempRow.$, field.eval(tempRow, database, trap));
					} catch(e) {
						throw new Error('["' + field.toString() + '" in field list]: ' + e.message);
					}
				});
			});
			return collectAggrs;
		};
		
		// ---------------------------
		// INITIALIZE DATASOURCES WITH JOIN ALGORITHIMS APPLIED
		// ---------------------------
		var tables = (_isArray(this.exprs.table) ? this.exprs.table : [this.exprs.table]).concat(this.exprs.joins || [])
			.map(table => table.eval(database, trap));
		var mainTable = tables.shift();
		
		this.base = new Base(trap, mainTable, this.exprs.where, ...tables);
		// BUILD (TEMP) ROWS, WHERE
		var tempRows = [], tempRow;
		while (tempRow = this.base.fetch()) {
			tempRows.push(tempRow);
		}
		// BUILD FIELDS
		var aggrFields = applyFields(tempRows, this.exprs.fields, true/*collectAggrs*/);

		// ---------------------------
		// GROUP BY?
		// ---------------------------
		if (this.exprs.groupBy || aggrExprs.aggr.length) {
			var groupBy = this.exprs.groupBy || new GroupBy([]);
			tempRows = groupBy.eval(tempRows, trap);
			// REVISIT RESPONSE ROWS and apply AGGR columns
			applyFields(tempRows, aggrFields.aggr);
		}

		// ---------------------------
		// WINDOWING
		// ---------------------------
		if (this.exprs.windows || aggrExprs.win.length) {
			var completed = [];
			aggrExprs.win.forEach(expr => {
				var uuid = expr.window.toString();
				if (completed.indexOf(uuid) === -1) {
					expr.window.eval(tempRows, this.exprs.windows, trap);
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
			tempRows = this.exprs.orderBy.eval(tempRows, trap);
		}

		// ---------------------------
		// DISTINCT
		// ---------------------------
		if (this.distinct) {
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
	toString(context = null) {
		return this.getToString(context, (clauseType, expr, clause) => {
			if (clauseType === 'fields') {
				return clause + ' ' + expr.map(x => x.toString(context)).join(', ');
			} else if (clauseType === 'windows') {
				return clause + ' ' + Object.keys(expr).map(
					windowName => windowName + ' AS ' + expr[windowName].toString(context)
				).join(', ');
			} else if (clauseType === 'groupBy' || clauseType === 'orderBy') {
				return clause + ' ' + expr.toString(context);
			} else if (clauseType === 'limit') {
				return clause + ' ' + expr.join(', ');
			}
		});
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, Static = Select) {
		if (expr.trim().substr(0, 6).toLowerCase() === 'select') {
			var stmtParse = super.getParse(expr, Static.clauses, parseCallback, (clauseType, _expr) => {
				if (clauseType === 'fields') {
					return Lexer.split(_expr, [',']).map(
						field => parseCallback(field.trim(), [Field])
					);
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
			});
			return new Static(
				stmtParse.exprs, 
				stmtParse.clauses, 
				(stmtParse.clauses.fields.match(/DISTINCT/i) || [])[0],
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

/**
 * @exports
 */
export default Select;
