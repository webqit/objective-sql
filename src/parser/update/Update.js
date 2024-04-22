
import Lexer from '@webqit/util/str/Lexer.js';
import StatementNode from '../StatementNode.js';
import Assignment from './Assignment.js';

export default class Update extends StatementNode {
	
	/**
	 * Instance properties
	 */
	expr;

	/**
	 * @constructor
	 */
	constructor(context) {
		super(context);
		this.ASSIGNMENT_LIST = [];
	}

	/**
	 * Adds an assignment.
	 * 
	 * @param Array assignments
	 * 
	 * @returns this
	 */
	add(...assignments) {
		if (!assignments.length) return this.ASSIGNMENT_LIST;
		this.ASSIGNMENT_LIST.push(...assignments);
		return this;
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
	static async parse(context, expr, parseCallback) {
		if (expr.trim().substr(0, 6).toLowerCase() !== 'UPDATE') return;
		let WITH_UAC = false;
		if (expr.match(/UPDATE[ ]+WITH[ ]+UAC/i)) {
			WITH_UAC = true;
			expr = expr.replace(/[ ]+WITH[ ]+UAC/i, '');
		}
		const instance = new this(context, { WITH_UAC });
		const stmtParse = await super.getParse(context, expr, WITH_UAC, this.clauses, parseCallback, params, (clauseType, _expr) => {
			if (clauseType === 'ASSIGNMENT_LIST') {
				return Promise.all(Lexer.split(_expr, [','])
					.map(assignment => parseCallback(context, assignment.trim(), [Assignment])));
			}
		});
		instance.add(...stmtParse.expr.ASSIGNMENT_LIST);
		return instance;
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