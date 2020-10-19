
/**
 * @imports
 */
import _mixin from '@onephrase/util/js/mixin.js';
import _isArray from '@onephrase/util/js/isArray.js';
import DeleteInterface from './DeleteInterface.js';
import Stmt from './Stmt.js';

/**
 * ---------------------------
 * Delete class
 * ---------------------------
 */				

export default class Delete extends _mixin(Stmt, DeleteInterface) {
	 
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
			Object.keys(rowComposition).forEach(alias => {
				var sourceTable;
				if (alias === this.base.table.alias) {
					sourceTable = this.base.table;
				} else {
					sourceTable = this.base.joins.filter(join => join.alias === alias)[0];
				}
				sourceTable.rows.forEach((row, i) => {
					if (row === rowComposition[alias]) {
						delete sourceTable.rows[i];
						count ++;
					}
				});
			});
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
		return this.getToString(params);
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}) {
		if (expr.trim().match(/^DELETE[ ]+FROM/, 'i')) {
			var withUac = false;
			if (expr.match(/DELETE[ ]+WITH[ ]+UAC/i)) {
				withUac = true;
				expr = expr.replace(/[ ]+WITH[ ]+UAC/i, '');
			}
			var stmtParse = super.getParse(expr, withUac, this.clauses, parseCallback, params);
			return new this(stmtParse.exprs, stmtParse.clauses, withUac);
		}
	}
};

/**
 * @prop object
 */
Delete.clauses = {
	table: 'DELETE[ ]+FROM',
	where: 'WHERE',
	// inner join, cross join, {left|right} [outer] join
	joins: '(INNER[ ]+|CROSS[ ]+|(LEFT|RIGHT)([ ]+OUTER)?[ ]+)?JOIN',
};