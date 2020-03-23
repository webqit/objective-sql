
/**
 * @imports
 */
import _merge from '@web-native-js/commons/obj/merge.js';
import _objFrom from '@web-native-js/commons/obj/from.js';
import Row from './Row.js';

/**
 * ---------------------------
 * Base class
 * ---------------------------
 */				

const Base = class {
	 
	/**
	 * @inheritdoc
	 */
	constructor(trap, table, where, ...joins) {
		this.trap = trap;
		this.table = table;
		this.where = where;
		this.joins = joins;
		// -------------------------
		this.schemas = {};
		[this.table, ...this.joins].forEach(table => {
			this.schemas[table.alias] = table.schema || {};
		});
		// -------------------------
		this._onfinish = [];
		if (this.joins.length) {
			this.joins.reduce((a, b) => {
				a.onfinish(b.next.bind(b)); return b;
			}, this.table).onfinish(() => {this.eof = true;});
		} else {
			this.table.onfinish(() => {this.eof = true;});
		}
		this.eof = false;
	}
	 
	/**
	 * @inheritdoc
	 */
	onfinish(callback) {this._onfinish.push(callback);}
	 
	/**
	 * @inheritdoc
	 */
	next() {
		// -----------------
		// Advance or initilaize?
		// -----------------
		if (this.initialized) {
			this.table.next();
		} else {
			this.initialized = true;
		}
		if (this.eof) {
			this._onfinish.forEach(callback => callback());
			return;
		}
		var tables = [this.table.alias];
		var rowBase = new Row(this.trap);
		_merge(0, rowBase, _objFrom(this.table.alias, this.table.fetch() || {}));
		// Add schema
		if (Object.keys(this.schemas).length) {
			rowBase['#'] = this.schemas;
		}
		if (this.joins.length) {
			this.joins.forEach(joinTable => {
				tables.push(joinTable.alias);
				_merge(0, rowBase, _objFrom(joinTable.alias, joinTable.fetch()));
				if (joinTable.join && joinTable.join.type && joinTable.join.type !== 'full') {
					try {
						if (joinTable.join.conditionClause.trim().toLowerCase() === 'using') {
							// Join using "column name"...
							var column = joinTable.join.condition.toString();
							var shouldJoin = rowBase[joinTable.alias][column] === rowBase[this.table.alias][column];
						} else {
							var shouldJoin = joinTable.join.condition.eval(rowBase, this.trap);
						}
					} catch(e) {
						throw new Error('["' + joinTable.join.condition.toString() + '" in JOIN clause]: ' + e.message);
					}
					if (!shouldJoin) {
						switch(joinTable.join.type) {
							case 'left':
								// Clear joined table
								Arr.remove(tables, joinTable.alias);
							break;
							case 'right':
								// Clear main table
								Arr.remove(tables, this.table.alias);
							break;
							case 'inner':
								// Clear both tables
								Arr.remove(tables, joinTable.alias);
								Arr.remove(tables, this.table.alias);
							break;
						}
					}
				}
			});
		}
		// -----------------
		// Invalid joins?
		// -----------------
		if (!tables.length) {
			return this.next();
		}
		try {
			if (this.where && !this.where.eval(rowBase, this.trap)) {
				return this.next();
			}
		} catch(e) {
			throw new Error('["' + this.where.toString() + '" in WHERE clause]: ' + e.message);
		}
		return rowBase;
	}
	 
	/**
	 * @inheritdoc
	 */
	fetch() {
		var tempRow = new Row(this.trap);
		[this.table, ...this.joins].forEach(table => {
			tempRow[table.alias] = table.fetch() || {};
		});
		return tempRow;
	}
	
	/**
	 * @inheritdoc
	 */
	delete() {
		return [this.table, ...this.joins].reduce((prevSuccess, table) => prevSuccess + (table.delete() ? 1 : 0), 0) / (1 + this.joins.length);
	}
};

/**
 * @exports
 */
export default Base;
