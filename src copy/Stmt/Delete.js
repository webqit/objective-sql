
/**
 * @imports
 */
import _mixin from '@onephrase/util/js/mixin.js';
import _isArray from '@onephrase/util/js/isArray.js';
import _arrFrom from '@onephrase/util/arr/from.js';
import _all from '@onephrase/util/arr/all.js';
import _before from '@onephrase/util/str/before.js';
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
		var targetTableNames, mainTable = this.exprs.table;
		if (this.exprs.deleteList.length) {
			targetTableNames = this.exprs.deleteList.map(t => t.endsWith('.*') ? _before(t, '.*') : t);
		} else if (this.exprs['using:table']) {
			targetTableNames = _arrFrom(this.exprs.table, false).map(t => t.getAlias());
			mainTable = this.exprs['using:table'];
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
				var rowID = _arrFrom(targetTables[alias].schema.primaryKey).map(key => rowComposition[alias][key]);
				if (!deletionIDs[alias].filter(_rowID => _all(_rowID, (id, i) => id === rowID[i])).length) {
					deletionIDs[alias].push(rowID);
				}
			});
		}

		// --------------------
		// Delete now
		// --------------------
		var keys = await Promise.all(targetTableNames.map(alias => {
			if (deletionIDs[alias].length) {
				return targetTables[alias].deleteAll(deletionIDs[alias]);
			}
		}));

		return {
			tables: tables.map(t => t.tableName),
			keys,
		};;
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
		if (expr.trim().substr(0, 6).toLowerCase() === 'delete') {
			var withUac = false;
			if (expr.match(/DELETE[ ]+WITH[ ]+UAC/i)) {
				withUac = true;
				expr = expr.replace(/[ ]+WITH[ ]+UAC/i, '');
			}
			var stmtParse = super.getParse(expr, withUac, this.clauses, parseCallback, params, (clauseType, _expr) => {
				if (clauseType === 'deleteList') {
					return _expr.split(',').map(t => t.trim()).filter(t => t);
				}
			});
			if (stmtParse.exprs.deleteList.length && stmtParse.exprs['using:table']) {
				throw new Error('The "using" keyword cannot be used in a query with explicitly-listed tables.');
			}
			return new this(stmtParse.exprs, stmtParse.clauses, withUac);
		}
	}
};

/**
 * @prop object
 */
Delete.clauses = {
	deleteList: 'DELETE',
	table: 'FROM',
	'using:table': 'USING',
	where: 'WHERE',
	// inner join, cross join, {left|right} [outer] join
	joins: '(INNER[ ]+|CROSS[ ]+|(LEFT|RIGHT)([ ]+OUTER)?[ ]+)?JOIN',
};