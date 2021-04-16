
/**
 * @imports
 */
import _avg from '@webqit/util/arr/avg.js';
import _unique from '@webqit/util/arr/unique.js';
import _max from '@webqit/util/arr/max.js';
import _min from '@webqit/util/arr/min.js';
import _sum from '@webqit/util/arr/sum.js';
import _first from '@webqit/util/arr/first.js';
import _last from '@webqit/util/arr/last.js';
import _rand from '@webqit/util/arr/rand.js';
import _isArray from '@webqit/util/js/isArray.js';
import _isNull from '@webqit/util/js/isNull.js';
import _after from '@webqit/util/str/after.js';
import _objFrom from '@webqit/util/obj/from.js';
import _merge from '@webqit/util/obj/merge.js';
import _get from '@webqit/util/obj/get.js';

/**
 * ---------------------------
 * Row class
 * ---------------------------
 */				

export default class Row {
	
	constructor(params) {
		Object.defineProperty(this, '.params', {value: params});
	}
	 
	/**
	 * @inheritdoc
	 */
	CONCAT(...args) {
		return args.join('');
	}
	 
	/**
	 * @inheritdoc
	 */
	CONCAT_WS(...args) {
		return args.join(args.shift());
	}
	 
	/**
	 * @inheritdoc
	 */
	COALESCE(...args) {
		return args.reduce((prev, next) => !_isNull(prev) ? prev : next, null);
	}
		 
	/**
	 * @inheritdoc
	 */
	FIND_IN_SET(substr, str) {
		return str.indexOf(substr);
	}
			 
	/**
	 * @inheritdoc
	 */
	ISNULL(val) {
		return _isNull(val);
	}
		
	/**
	 * ----------------
	 * AGGREGATE FUNCTIONS
	 * ----------------
	 */
	
	/**
	 * @inheritdoc
	 */
	COUNT(rows, flag, column) {
		if (column.stringify() === '*') {
			// NULLs accepted
			return rows.length;
		}
		return this.COLUMN(rows, flag, column).length;
	}
	
	/**
	 * @inheritdoc
	 */
	GROUP_CONCAT(rows, flag, column) {
		return this.COLUMN(rows, flag, column).join('');
	}
	
	/**
	 * @inheritdoc
	 */
	GROUP_CONCAT_WS(rows, flag, separator, column) {
		return this.COLUMN(rows, flag, column).join(separator.eval(this, this['.params']));
	}
	
	/**
	 * @inheritdoc
	 */
	AVG(rows, flag, column) {
		return _avg(this.COLUMN(rows, flag, column));
	}
	
	/**
	 * @inheritdoc
	 */
	MAX(rows, flag, column) {
		return _max(this.COLUMN(rows, flag, column));
	}
	
	/**
	 * @inheritdoc
	 */
	MIN(rows, flag, column) {
		return _min(this.COLUMN(rows, flag, column));
	}
	
	/**
	 * @inheritdoc
	 */
	SUM(rows, flag, column) {
		return _sum(this.COLUMN(rows, flag, column));
	}

	/**
	 * ----------------
	 * AGGREGATE SUPPORT FUNCTIONS
	 * ----------------
	 */
	
	/**
	 * @inheritdoc
	 */
	FIRST(rows, flag, column) {
		// NULLs accepted
		return column.eval(_first(rows) || {}, this['.params']);
	}
	
	/**
	 * @inheritdoc
	 */
	LAST(rows, flag, column) {
		// NULLs accepted
		return column.eval(_last(rows) || {}, this['.params']);
	}
	
	/**
	 * @inheritdoc
	 */
	ANY_VALUE(rows, flag, column) {
		return _rand(this.COLUMN(rows, flag, column));
	}
	
	/**
	 * @inheritdoc
	 */
	GROUPING(rows, flag, ...onColumns) {
		if (!this.AGGR || !this.AGGR.isRollup) {
			return 0;
		}
		return onColumns.reduce((cum, column, i) => {
			var match = this.AGGR.by.filter(by => {
				var byStr = by.stringify();
				var columnStr = column.stringify();
				if (columnStr.indexOf('.') === -1 && byStr.indexOf('.') > -1) {
					byStr = _after(byStr, '.');
				}
				return columnStr === byStr;
			});
			return match.length ? i + 1 : cum;
		}, 0);
	}
	
	/**
	 * @inheritdoc
	 */
	COLUMN(rows, flag, arg) {
		var result = rows.map(row => arg.eval(row, this['.params']));
		// COALESCE?
		if (_isArray(result[0])) {
			var width = result[0].length;
			result = result.filter(values => {
				if (!_isArray(values) || values.length !== width) {
					throw new Error('Aggregate column list not even!');
				}
				return values.reduce((_v, v) => !_isNull(_v) ? _v : v, null);
			});
		}
		// NO NULLS!
		result = result.filter(v => !_isNull(v));
		// DISTINCT?
		if (flag.toUpperCase() === 'DISTINCT') {
			result = _unique(result);
		}
		return result;
	}
	
	/**
	 * @inheritdoc
	 */
	COLUMNS(rows, flag, args) {
		return args.map(arg => this.COLUMN(rows, flag, arg));
	}
	
	/**
	 * ----------------
	 * JSON FUNCTIONS
	 * ----------------
	 */
	
	/**
	 * @inheritdoc
	 */
	JSON_EXTRACT(doc, path) {
		return _get(JSON.parse(doc), path.split('.').slice(1));
	}
	
	/**
	 * @inheritdoc
	 */
	JSON_OBJECT(name, value) {
		return _objFrom(name, value);
	}
	
	/**
	 * @inheritdoc
	 */
	JSON_MERGE(doc1, doc2) {
		return _merge(JSON.parse(doc1), JSON.parse(doc2));
	}
}