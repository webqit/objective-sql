
/**
 * @imports
 */
import _last from '@onephrase/util/arr/last.js';
import _remove from '@onephrase/util/arr/remove.js';
import _merge from '@onephrase/util/obj/merge.js';
import _objFrom from '@onephrase/util/obj/from.js';
import Row from './Row.js';

/**
 * ---------------------------
 * Base class
 * ---------------------------
 */				

export default class Base {
	 
	/**
	 * @inheritdoc
	 */
	constructor(params, table, where, ...joins) {
		this.params = params;
		this.table = table;
		this.where = where;
		this.joins = joins;
		// -------------------------
		this.tables = this.joins.concat(this.table);
		// -------------------------
		this._onfinish = [];
		this.cursors = Promise.all(this.tables.map(table => table.getCursor())).then(cursors => {
			cursors.reduce((prev, current) => {
				if (prev) {
					prev.onfinish(current.next.bind(current));
				}
				return current;
			}, null).onfinish(() => {
				this.eof = true;
				this._onfinish.forEach(callback => callback());
			});
			// ------------
			return cursors;
		});
	}

	/**
	 * @inheritdoc
	 */
	async fetch() {
		if (this.eof) {
			return;
		}

		var row = await this.cursors.then(async cursors => {
			// Obtain rowBase and joinedRows
			var rowCompositionRejection;
			var baseCursor = _last(cursors),
				baseRowData = await baseCursor.fetch(),
				joinedCursors = cursors.slice(0, - 1);
			var joinedRowData = await Promise.all(joinedCursors.map(async (joinCursor, i) => {
				if (rowCompositionRejection) {
					return;
				}
				// ---------------------
				var joinRow = await joinCursor.fetch();
				try {
					if (!this.tables[i].join || this.tables[i].join.type === 'full') {
						joinCursor.flags[baseCursor.key] = true;
						return joinRow;
					} else if (this.tables[i].join.conditionClause.trim().toLowerCase() === 'using') {
						// Join using "column name"...
						var column = this.tables[i].join.condition.stringify();
						if (joinRow[column] === baseRowData[column]) {
							joinCursor.flags[baseCursor.key] = true;
							return joinRow;
						}
					} else {
						var conditionRowComposition = new Row(this.params);
						conditionRowComposition[this.table.alias] = baseRowData;
						conditionRowComposition[this.tables[i].alias] = joinRow;
						if (this.tables[i].join.condition.eval(conditionRowComposition, this.params)) {
							joinCursor.flags[baseCursor.key] = true;
							return joinRow;
						}						
					}
				} catch(e) {
					throw new Error('["' + this.tables[i].join.condition.stringify() + '" in JOIN clause]: ' + e.message);
				}
				// ---------------------
				// Left/Right Join 
				// ---------------------
				if (!joinCursor.flags[baseCursor.key]) {
					if (joinCursor.eof() && this.tables[i].join.type === 'left') {
						return {};
					} else if (baseCursor.eof() && this.tables[i].join.type === 'right') {
						baseRowData = {};
						return joinRow;
					}
				}
				rowCompositionRejection = true;
			}));
			// -------------------------
			// Advance cursor
			cursors[0].next();
			// -------------------------
			// Filter by join status
			if (joinedRowData.filter(t => t).length === joinedCursors.length) {
				var rowComposition = new Row(this.params);
				rowComposition[this.table.alias] = baseRowData;
				joinedRowData.forEach((rowMember, i) => {
					rowComposition[this.tables[i].alias] = rowMember;
				});
				return rowComposition;
			}
		});
		// ----------
		// Apply where
		// ----------
		try {
			if (!row || (this.where && !this.where.eval(row, this.params))) {
				return await this.fetch();
			}
		} catch(e) {
			throw new Error('["' + this.where.stringify() + '" in WHERE clause]: ' + e.message);
		}
		return row;
	}
	 
	/**
	 * @inheritdoc
	 */
	onfinish(callback) {this._onfinish.push(callback);}
};