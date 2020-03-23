
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
	constructor(exprs, clauses) {
		super();
		this.exprs = exprs;
		this.clauses = clauses;
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
		var rowCount = 0;
		while(this.base.next()) {
			rowCount += this.base.delete();
		}
		return rowCount;
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
	static parse(expr, parseCallback, Static = Delete) {
		if (expr.trim().match(/^DELETE[ ]+FROM/, 'i')) {
			var stmtParse = super.getParse(expr, Static.clauses, parseCallback);
			return new Static(stmtParse.exprs, stmtParse.clauses);
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
