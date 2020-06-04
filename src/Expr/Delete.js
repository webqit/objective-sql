
/**
 * @imports
 */
import _mixin from '@web-native-js/commons/js/mixin.js';
import _isArray from '@web-native-js/commons/js/isArray.js';
import Stmt from './Stmt.js';
import DeleteInterface from './DeleteInterface.js';
import Base from '../Base/Base.js';

/**
 * ---------------------------
 * Delete class
 * ---------------------------
 */				

const Delete = class extends _mixin(Stmt, DeleteInterface) {
	 
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
	eval(database, trap = {}) {
		// ---------------------------
		// INITIALIZE DATASOURCES WITH JOIN ALGORITHIMS APPLIED
		// ---------------------------
		var tables = (_isArray(this.exprs.table) ? this.exprs.table : [this.exprs.table]).concat(this.exprs.joins || []);
		tables = tables.map(table => table.eval(database, trap))
		this.base = new Base(trap, tables.shift(), this.exprs.where, ...tables);
		var rowComposition, count = 0;
		while(rowComposition = this.base.fetch()) {
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
	toString(context = null) {
		return this.getToString(context);
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}, Static = Delete) {
		if (expr.trim().match(/^DELETE[ ]+FROM/, 'i')) {
			var withUac = false;
			if (expr.match(/DELETE[ ]+WITH[ ]+UAC/i)) {
				withUac = true;
				expr = expr.replace(/[ ]+WITH[ ]+UAC/i, '');
			}
			var stmtParse = super.getParse(expr, withUac, Static.clauses, parseCallback);
			return new Static(stmtParse.exprs, stmtParse.clauses, withUac);
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

/**
 * @exports
 */
export default Delete;
