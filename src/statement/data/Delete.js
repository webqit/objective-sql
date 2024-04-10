
/**
 * @imports
 */
import _mixin from '@webqit/util/js/mixin.js';
import _isArray from '@webqit/util/js/isArray.js';
import _arrFrom from '@webqit/util/arr/from.js';
import _all from '@webqit/util/arr/all.js';
import _before from '@webqit/util/str/before.js';
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

		// --------------------
		// RESOLVE DELETION SOURCES AND TARGETS
		// --------------------
		var targetTableNames,
			mainTable = this.exprs.TABLE_REFERENCES;
		if (this.exprs.DELETE_LIST.length) {
			targetTableNames = this.exprs.DELETE_LIST.map(t => t.endsWith('.*') ? _before(t, '.*') : t);
		} else if (this.exprs.USING_CLAUSE) {
			targetTableNames = _arrFrom(this.exprs.TABLE_REFERENCES, false).map(t => t.getAlias());
			mainTable = this.exprs.USING_CLAUSE;
		} else {
			// IMPORTANT: only first table in here
			targetTableNames = [(_isArray(mainTable) ? mainTable[0] : mainTable).getAlias()];
		}

		// --------------------
		// INITIALIZE DATASOURCES WITH JOIN ALGORITHIMS APPLIED
		// --------------------
		var _params = {...params};
		_params.mode = 'readwrite';
		this.base = this.getBase(database, _params, _arrFrom(mainTable, false));

		// --------------------
		// Finds named tables
		// --------------------
		var targetTables = {},
			deletionIDs = {},
			tables = await Promise.all(this.base.joins.concat(this.base.main));
		targetTableNames.forEach(alias => {
			targetTables[alias] = tables.filter(table => (table.params.alias || table.name) === alias)[0];
			if (!targetTables[alias]) {
				throw new Error('"' + alias + '" in table list is not found in main query.');
			}
		});

		// --------------------
		// Mine IDs
		// --------------------
		var rowComposition;
		while(rowComposition = await this.base.fetch()) {
			targetTableNames.forEach(alias => {
				if (!deletionIDs[alias]) {
					deletionIDs[alias] = [];
				}
				var rowID = _arrFrom(targetTables[alias].def.schema.primaryKey).map(key => rowComposition[alias][key]);
				if (!deletionIDs[alias].filter(_rowID => _all(_rowID, (id, i) => id === rowID[i])).length) {
					deletionIDs[alias].push(rowID);
				}
			});
		}

		// --------------------
		// Delete now
		// --------------------
		var result = await Promise.all(targetTableNames.map(async alias => {
			if (deletionIDs[alias].length) {
				var affectedRows = await targetTables[alias].deleteAll(deletionIDs[alias]);
				return {[alias]: affectedRows};
			}
		}));
		return result.reduce((result, currentResult) => ({...result, ...currentResult}), {});
	}
	
	/**
	 * @inheritdoc
	 */
	toString() { return this.stringify(); }
	
	/**
	 * @inheritdoc
	 */
	stringify(params = {}) { return this.getToString(params); }
	
	/**
	 * @inheritdoc
	 */
	static async parse(expr, parseCallback, params = {}) {
		if (expr.trim().substr(0, 6).toLowerCase() === 'delete') {
			var withUac = false;
			if (expr.match(/DELETE[ ]+WITH[ ]+UAC/i)) {
				withUac = true;
				expr = expr.replace(/[ ]+WITH[ ]+UAC/i, '');
			}
			var stmtParse = await super.getParse(expr, withUac, this.clauses, parseCallback, params, (clauseType, _expr) => {
				if (clauseType === 'DELETE_LIST') {
					return _expr.split(',').map(t => t.trim()).filter(t => t);
				}
			});
			if (stmtParse.exprs.DELETE_LIST.length && stmtParse.exprs.USING_CLAUSE) {
				throw new Error('The "using" keyword cannot be used in a query with explicitly-listed tables.');
			}
			return new this(stmtParse.exprs, stmtParse.clauses, withUac);
		}
	}
}

/**
 * @prop object
 */
Delete.clauses = {
	DELETE_LIST: 'DELETE',
	TABLE_REFERENCES: 'FROM',
	USING_CLAUSE: 'USING',
	WHERE_CLAUSE: 'WHERE',
	// inner join, cross join, {left|right} [outer] join
	JOIN_CLAUSE: '(INNER[ ]+|CROSS[ ]+|(LEFT|RIGHT)([ ]+OUTER)?[ ]+)?JOIN',
};