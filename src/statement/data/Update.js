
/**
 * @imports
 */
import _mixin from '@webqit/util/js/mixin.js';
import _isArray from '@webqit/util/js/isArray.js';
import Lexer from '@webqit/util/str/Lexer.js';
import UpdateInterface from './UpdateInterface.js';
import Assignment from './Assignment.js';
import Stmt from './Stmt.js';

/**
 * ---------------------------
 * Update class
 * ---------------------------
 */				

export default class Update extends _mixin(Stmt, UpdateInterface) {
	 
	/**
	 * @inheritdoc
	 */
	constructor(exprs, clauses, withUac) {
		super();
		this.exprs = exprs;
		this.clauses = clauses;
		this.withUac = withUac;
	}
	
	/**
	 * @inheritdoc
	 */
	async eval(database, params = {}) {
		// ---------------------------
		// INITIALIZE DATASOURCES WITH JOIN ALGORITHIMS APPLIED
		// ---------------------------
		var _params = {...params};
		_params.mode = 'readwrite';
		this.base = this.getBase(database, _params);
		var rowComposition;
		while(rowComposition = await this.base.fetch()) {
			this.exprs.ASSIGNMENT_LIST.forEach(assignment => assignment.eval(rowComposition, params));
		}
		var __keys = await this.base.syncCursors();
		return Promise.all(this.base.joins.concat(this.base.main))
			.then(list => list.reduce((result, t, i) => ({[t.name]: __keys[i], ...result}), {}));
	}
	
	/**
	 * @inheritdoc
	 */
	toString() { return this.stringify(); }
	
	/**
	 * @inheritdoc
	 */
	stringify(params = {}) {
		return this.getToString(params, (clauseType, expr, clause, _params, _t) => {
			if (clauseType === 'ASSIGNMENT_LIST') {
				return clause + ' ' + expr.map(assignment => assignment.stringify(_params)).join(', ');
			}
		});
	}
	
	/**
	 * @inheritdoc
	 */
	static async parse(expr, parseCallback, params = {}) {
		if (expr.trim().substr(0, 6).toLowerCase() === 'update') {
			var withUac = false;
			if (expr.match(/UPDATE[ ]+WITH[ ]+UAC/i)) {
				withUac = true;
				expr = expr.replace(/[ ]+WITH[ ]+UAC/i, '');
			}
			var stmtParse = await super.getParse(expr, withUac, this.clauses, parseCallback, params, (clauseType, _expr) => {
				if (clauseType === 'ASSIGNMENT_LIST') {
					return Promise.all(Lexer.split(_expr, [','])
						.map(assignment => parseCallback(assignment.trim(), [Assignment])));
				}
			});
			return new this(stmtParse.exprs, stmtParse.clauses, withUac);
		}
	}
}

/**
 * @prop object
 */
Update.clauses = {
	TABLE_REFERENCES: 'UPDATE',
	ASSIGNMENT_LIST: 'SET',
	WHERE_CLAUSE: 'WHERE',
	// inner join, cross join, {left|right} [outer] join
	JOIN_CLAUSE: '(INNER[ ]+|CROSS[ ]+|(LEFT|RIGHT)([ ]+OUTER)?[ ]+)?JOIN',
};