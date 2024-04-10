
/**
 * @imports
 */
import _last from '@webqit/util/arr/last.js';
import _remove from '@webqit/util/arr/remove.js';
import _merge from '@webqit/util/obj/merge.js';
import _objFrom from '@webqit/util/obj/from.js';
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
	constructor(main, joins, where, params) {
		// -------------------------
		this.main = main;
		this.joins = joins;
		// -------------------------
		this.mainCursor = main.then(m => m.getCursor());
		this.joinCursors = joins.map(join => join.then(j => j.getCursor()));
		// -------------------------
		this.where = where;
		this.params = params;
		// -------------------------
		this._onfinish = [];
		Promise.all(this.joinCursors).then(joinCursors => {
			// Advcance joins sequentially...
			var lastJoinCursor = joinCursors.reduce((prevCursor, currentCursor) => {
				if (prevCursor) {
					prevCursor.onfinish(currentCursor.next.bind(currentCursor));
				}
				return currentCursor;
			}, null);
			this.mainCursor.then(mainCursor => {
				// Last join cursor should advance main cursor
				if (lastJoinCursor) {
					lastJoinCursor.onfinish(mainCursor.next.bind(mainCursor));
				}
				// Fire onfinish event from main cursor
				mainCursor.onfinish(() => {
					this.eof = true;
					this._onfinish.forEach(callback => callback());
				});
			});
		});
	}
	 
	/**
	 * @inheritdoc
	 */
	onfinish(callback) { this._onfinish.push(callback); }

	/**
	 * @inheritdoc
	 */
	async fetch() {
		if (this.eof) return;

		var rowComposition, rowCompositionRejection;
		// -----------
		let __main = await this.main,
			__mainCursor = await this.mainCursor,
			__mainFetch = await __mainCursor.fetch(),
			__mainAlias = __main.params.alias || __main.name;
		// -----------
		let __joins = await Promise.all(this.joins),
			__joinCursors = await Promise.all(this.joinCursors);
		// -----------
		let joinFetches = __joinCursors.map(async (__joinCursor, i) => {
				if (rowCompositionRejection) {
					return;
				}
				var __joinFetch = await __joinCursor.fetch(),
					__joinAlias = __joins[i].params.alias || __joins[i].name;
				if (!__joins[i].join || __joins[i].join.type === 'full') {
					__joinCursor.flags[__mainCursor.key] = true;
					return __joinFetch;
				} else if (__joins[i].join.conditionClause.trim().toLowerCase() === 'using') {
					// Join using "column name"...
					var column = __joins[i].join.condition.stringify();
					if (__joinFetch[column] === __mainFetch[column]) {
						__joinCursor.flags[__mainCursor.key] = true;
						return __joinFetch;
					}
				} else {
					var conditionRowComposition = new Row(this.params);
					conditionRowComposition[__mainAlias] = __mainFetch;
					conditionRowComposition[__joinAlias] = __joinFetch;
					if (__joins[i].join.condition.eval(conditionRowComposition, this.params)) {
						__joinCursor.flags[__mainCursor.key] = true;
						return __joinFetch;
					}						
				}
				// ---------------------
				// Left/Right Join 
				// ---------------------
				if (!__joinCursor.flags[__mainCursor.key]) {
					if (__joinCursor.eof() && __joins[i].join.type.toLowerCase() === 'left') {
						return {};
					} else if (__mainCursor.eof() && __joins[i].join.type.toLowerCase() === 'right') {
						__mainFetch = {};
						return null;
					}
				}
				rowCompositionRejection = true;
		});
		let __joinFetches = await Promise.all(joinFetches);
		// -------------------------
		// Advance cursor.
		// IMPORTANT: AFTER HAVING WAITED FOR joinFetches
		(__joinCursors[0] || __mainCursor).next();
		// -------------------------
		// Filter by join status
		if (__joinFetches.filter(t => t).length === joinFetches.length) {
			var _rowComposition = new Row(this.params);
			_rowComposition[__mainAlias] = __mainFetch;
			__joinFetches.forEach((rowMember, i) => {
				var __joinAlias = __joins[i].params.alias || __joins[i].name;
				_rowComposition[__joinAlias] = rowMember;
			});
			rowComposition = _rowComposition;
		}
		// ----------
		// Apply where
		// ----------
		try {
			if (!rowComposition || (this.where && !this.where.eval(rowComposition, this.params))) {
				return await this.fetch();
			}
		} catch(e) {
			throw new Error('["' + this.where.stringify() + '" in WHERE clause]: ' + e.message);
		}
		return rowComposition;
	}

	/**
	 * @inheritdoc
	 */
	async syncCursors() {
		var __tables = await Promise.all(this.joins.concat(this.main));
		var __cursors = await Promise.all(this.joinCursors.concat(this.mainCursor));
		return Promise.all(__cursors.map((cursor, i) => {
			return __tables[i].syncCursor(cursor);
		}));
	}
}