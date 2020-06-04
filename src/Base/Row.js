
/**
 * @imports
 */
import _avg from '@web-native-js/commons/arr/avg.js';
import _unique from '@web-native-js/commons/arr/unique.js';
import _max from '@web-native-js/commons/arr/max.js';
import _min from '@web-native-js/commons/arr/min.js';
import _sum from '@web-native-js/commons/arr/sum.js';
import _rand from '@web-native-js/commons/arr/rand.js';
import _isNull from '@web-native-js/commons/js/isNull.js';
import _after from '@web-native-js/commons/str/after.js';
import _objFrom from '@web-native-js/commons/obj/from.js';
import _merge from '@web-native-js/commons/obj/merge.js';
import _get from '@web-native-js/commons/obj/get.js';

/**
 * ---------------------------
 * Row class
 * ---------------------------
 */				

export default class Row {
	
	constructor(trap) {
		Object.defineProperty(this, '.trap', {value: trap});
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
	COUNT(rows, column) {
		if (column.toString() === '*') {
			return rows.length;
		}
		if (arguments.length === 3 && column.toString().toUpperCase() === 'DISTINCT') {
			var vals = _unique(this.COLUMN(rows, arguments[2]));
		} else {
			var vals = this.COLUMN(rows, column);
		}
		return vals.filter(v => !_isNull(v)).length;
	}
	
	/**
	 * @inheritdoc
	 */
	GROUP_CONCAT(rows, column) {
		return this.COLUMN(rows, column).join('');
	}
	
	/**
	 * @inheritdoc
	 */
	GROUP_CONCAT_WS(rows, separator, column) {
		return this.COLUMN(rows, column).join(separator.eval(this, this['.trap']));
	}
	
	/**
	 * @inheritdoc
	 */
	AVG(rows, column) {
		return _avg(this.COLUMN(rows, column));
	}
	
	/**
	 * @inheritdoc
	 */
	MAX(rows, column) {
		return _max(this.COLUMN(rows, column));
	}
	
	/**
	 * @inheritdoc
	 */
	MIN(rows, column) {
		return _min(this.COLUMN(rows, column));
	}
	
	/**
	 * @inheritdoc
	 */
	SUM(rows, column) {
		return _sum(this.COLUMN(rows, column));
	}

	/**
	 * ----------------
	 * AGGREGATE SUPPORT FUNCTIONS
	 * ----------------
	 */
	
	/**
	 * @inheritdoc
	 */
	ANY_VALUE(rows, column) {
		return _rand(this.COLUMN(rows, column));
	}
	
	/**
	 * @inheritdoc
	 */
	GROUPING(rows, ...onColumns) {
		if (!this.AGGR || !this.AGGR.isRollup) {
			return 0;
		}
		return onColumns.reduce((cum, column, i) => {
			var match = this.AGGR.by.filter(by => {
				var byStr = by.toString();
				var columnStr = column.toString();
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
	COLUMN(rows, arg) {
		return rows.map(row => arg.eval(row, this['.trap']));
	}
	
	/**
	 * @inheritdoc
	 */
	COLUMNS(rows, args) {
		return args.map(arg => this.COLUMN(rows, arg));
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
};