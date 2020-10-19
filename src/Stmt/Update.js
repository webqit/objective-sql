
/**
 * @imports
 */
import _mixin from '@onephrase/util/js/mixin.js';
import _isArray from '@onephrase/util/js/isArray.js';
import Lexer from '@onephrase/util/str/Lexer.js';
import UpdateInterface from './UpdateInterface.js';
import { Assignment } from '@web-native-js/jsen';
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
		this.base = this.getBase(database, params);
		var rowComposition, count = 0;
		while(rowComposition = await this.base.fetch()) {
			this.exprs.assignments.forEach(assignment => assignment.eval(rowComposition, params));
			count ++;
		}
		return count;
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
			if (clauseType === 'assignments') {
				return clause + ' ' + expr.map(assignment => assignment.stringify(params)).join(', ');
			}
		});
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}) {
		if (expr.trim().substr(0, 6).toLowerCase() === 'update') {
			var withUac = false;
			if (expr.match(/UPDATE[ ]+WITH[ ]+UAC/i)) {
				withUac = true;
				expr = expr.replace(/[ ]+WITH[ ]+UAC/i, '');
			}
			var stmtParse = super.getParse(expr, withUac, this.clauses, parseCallback, params, (clauseType, _expr) => {
				if (clauseType === 'assignments') {
					return Lexer.split(_expr, [','])
						.map(assignment => parseCallback(assignment.trim(), [Assignment]));
				}
			});
			return new this(stmtParse.exprs, stmtParse.clauses, withUac);
		}
	}
};

/**
 * @prop object
 */
Update.clauses = {
	table: 'UPDATE',
	assignments: 'SET',
	where: 'WHERE',
	// inner join, cross join, {left|right} [outer] join
	joins: '(INNER[ ]+|CROSS[ ]+|(LEFT|RIGHT)([ ]+OUTER)?[ ]+)?JOIN',
};