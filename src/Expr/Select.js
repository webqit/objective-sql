
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
	 * @inheritdoc
	 */
	eval(database, trap = {}) {
		// ---------------------------
		// UNDERSTAND AGGREGATIONS
		// ---------------------------
		var aggrExprs = {aggr:[], win:[]};
		var pathExprs = [];
		this.meta.vars.forEach(x => {
			if (x instanceof AggrInterface) {
				_pushUnique(x.window ? aggrExprs.win : aggrExprs.aggr, x);
			}
			if (x.isPath) {
				_pushUnique(pathExprs, x);
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
							// But we'll set it to UNDEFINED (not NULL), to secure slot
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
		
		/**
		pathExprs.forEach(pathReference => {
			var pathLexer = new PathLexer(pathReference.name);
			var fields, fieldDef, match = pathLexer.match();
			if (mainTable.schema 
			&& (fields = mainTable.schema.fields) 
			&& (fieldDef = fields[match.subject]) 
			&& (fieldDef.type || '').toLowerCase() === 'json') {
				this.handleJsonAccess(match.subject, Lexer.finalOperand);
			} else {
				this.handleSmartJoin(match);
			}
		});
		*/
		
		this.base = new Base(trap, mainTable, this.exprs.where, ...tables);
		// BUILD (TEMP) ROWS, WHERE
		var tempRows = [];
		while (this.base.next()) {
			tempRows.push(this.base.fetch());
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
	 * Creates the necessary join to satisfy access field names with the "->" and/or "<-".
	 *
	 * @param object 	match
	 *
	 * @return void
	 */
	_handleSmartJoin(match) {
		var accessPath = match.subject;
		var fields = null;
		match.functions.forEach((func, i) => {
			if (func.name.toLowerCase() === 'select') {
				fields = _arrFrom(fields).concat(func.args);
				match.functions.splice(i, 1);
			}
		});
		// -----------------------
		var paramsObject = new Relationist(this.tableName, match.subject);
		var paramsObject_immediateTarget = paramsObject.getImmediateTarget();
		var actingKey = paramsObject_immediateTarget.actingKey;
		var postTarget = paramsObject_immediateTarget.postTarget;
		var uniqueTargetID = PathLexer.getSignature(paramsObject_immediateTarget.subject(), match.functions);
		if (!this.smartJoins[uniqueTargetID]) {
			this.smartJoins[uniqueTargetID] = paramsObject;
			paramsObject_immediateTarget.query().apply(match.functions);
		} else {
			paramsObject_immediateTarget = this.smartJoins[uniqueTargetID].getImmediateTarget();
		}
		// -----------------------
		// The acting key needed on the join's "on" clause.
		paramsObject_immediateTarget.query().select(actingKey);
		// The select magic, with the backtick saviour
		if (postTarget) {
			paramsObject_immediateTarget.query().select(new Expression('`' + postTarget + '` AS `' + match.query + '`'));
		} else if (_array(fields) || _array(match.body) || match.functions) {
			fields = _array(fields) ? fields : match.body;
			if (_array(fields) && fields.length > 1 
			|| (_arrFrom(fields)[0] === '*' && (fields = paramsObject_immediateTarget.blueprint().fields.keys()))
			|| (fields = paramsObject_immediateTarget.blueprint().defaultFields)) {
				fields = fields.map(field => {
					var {field, alias} = Static.splitAlias(field);
					return 'JSON_OBJECT("' + (alias || field) + '", ' + field + ')';
				});
				fields = fields.length > 1 ? 'JSON_MERGE(' + fields.join(', ') + ')' : fields[0];
			} else {
				fields = fields[0];
			}
			paramsObject_immediateTarget.query().select(new Expression(fields + ' AS `' + match.query + '`'));
		}
		// -----------------------
		// Use UAC?
		if (this.withUac) {
			paramsObject_immediateTarget.query().withUac();
		}
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
