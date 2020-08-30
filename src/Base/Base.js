
/**
 * @imports
 */
import _remove from '@web-native-js/commons/arr/remove.js';
import _merge from '@web-native-js/commons/obj/merge.js';
import _objFrom from '@web-native-js/commons/obj/from.js';
import Cursor from './Cursor.js';
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
		this.cursor = new Cursor(...table.rows.filter(r => r));
		this.cursor.onfinish(() => {
			this.eof = true;
			this._onfinish.forEach(callback => callback());
		});
		this._onfinish = [];
	}
	 
	/**
	 * @inheritdoc
	 */
	onfinish(callback) {this._onfinish.push(callback);}
	 
	/**
	 * @inheritdoc
	 */
	createJoinCursors(baseAlias, baseRow, finishCallback) {
		// ----------
		// Fill cursors
		// ----------
		var cursors = this.joins.map(join => {
			var cursor = new Cursor;
			cursor.source = join;
			return cursor;
		});
		for (var i = 0; i < this.joins.length; i ++) {
			var joinTable = this.joins[i];
			var cursor = cursors.filter(cursor => cursor.source.alias === joinTable.alias)[0];
			joinTable.rows.forEach(joinRow => {
				if (!joinRow) {
					return;
				}
				if (!joinTable.join || joinTable.join.type === 'full') {
					cursor.push(joinRow);
				} else {
					try {
						if (joinTable.join.conditionClause.trim().toLowerCase() === 'using') {
							// Join using "column name"...
							var column = joinTable.join.condition.toString();
							var shouldJoin = joinRow[column] === baseRow[column];
						} else {
							var rowComposition = new Row(this.params);
							rowComposition[baseAlias] = baseRow;
							rowComposition[joinTable.alias] = joinRow;
							var shouldJoin = joinTable.join.condition.eval(rowComposition, this.params);
						}
						if (shouldJoin) {
							cursor.push(joinRow);
						}
					} catch(e) {
						throw new Error('["' + joinTable.join.condition.toString() + '" in JOIN clause]: ' + e.message);
					}
				}
			});
			if (!cursor.length) {
				switch(joinTable.join.type) {
					case 'left':
						// Clear joined table
						cursor.push({});
					break;
					case 'right':
						// Clear base table
						baseRow = {};
					break;
					case 'inner':
						// Invalid base row
						return;
					break;
				}
			}
		};
		// ----------
		// Setup cursors
		// ----------
		return cursors.map((cursor, i) => {
			var following = cursors[i + 1];
			if (!following) {
				cursor.onfinish(finishCallback);
			} else {
				cursor.onfinish(following.advance.bind(following));
			}
			return cursor;
		});
	}

	/**
	 * @inheritdoc
	 */
	fetch() {
		if (this.eof) {
			return;
		}
		var rowComposition = new Row(this.params);
		rowComposition[this.table.alias] = this.cursor.fetch();
		if (this.joins.length) {
			// ----------
			// Setup
			// ----------
			if (!this.joinCursors) {
				var baseAlias = this.table.alias;
				var baseRow = this.cursor.fetch();
				this.cursor.advance();
				this.joinCursors = this.createJoinCursors(baseAlias, baseRow, () => {
					this.joinCursors = null;
				});
				// An innerjoin caused an invalid row
				if (!this.joinCursors) {
					return this.fetch();
				}
			}
			// ----------
			// Build rows now
			// ----------
			this.joinCursors.forEach(cursor => {
				rowComposition[cursor.source.alias] = cursor.fetch();
			});
			this.joinCursors[0].advance();
		} else {
			this.cursor.advance();
		}
		// ----------
		// Apply where
		// ----------
		try {
			if (this.where && !this.where.eval(rowComposition, this.params)) {
				return this.fetch();
			}
		} catch(e) {
			throw new Error('["' + this.where.toString() + '" in WHERE clause]: ' + e.message);
		}
		return rowComposition;
	}
};