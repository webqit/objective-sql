
/**
 * @imports
 */
import _isObject from '@web-native-js/commons/js/isObject.js';
import FetchInterface from './FetchInterface.js';

/**
 * ---------------------------
 * Table class
 * ---------------------------
 */				

const Table = class extends FetchInterface {
	 
	/**
	 * @inheritdoc
	 */
	constructor(rows, alias, iterateOnce = false) {
		super();
		this.rows = rows;
		this.alias = alias;
		this.iterateOnce = iterateOnce;
		// -----------------
		this.schema = rows.schema;
		if (!rows.schema) {
			this.schema = {fields:{}, uniqueKeys:[]};
		}
		// -----------------
		this._onfinish = [];
		this.cursor = -1;
		this.next();
	}
	 
	/**
	 * @inheritdoc
	 */
	onfinish(callback) {this._onfinish.push(callback);}
	 
	/**
	 * @inheritdoc
	 */
	next() {
		if (this.cursor === -1) {
			this.cursor = 0;
			return;
		}
		if (this.cursor < this.rows.length - 1) {
			this.cursor ++;
			return;
		}
		if (!this.rows.length || this.cursor === this.rows.length - 1) {
			this._onfinish.forEach(callback => callback());
			if (!this.iterateOnce) {
				this.cursor = 0;
			}
		}
	}
	 
	/**
	 * @inheritdoc
	 */
	fetch() {
		if (this.cursor < this.rows.length) {
			return this.rows[this.cursor];
		}
	}
	 
	/**
	 * @inheritdoc
	 */
	delete() {
		if (this.cursor < this.rows.length) {
			delete this.rows[this.cursor];
			return true;
		}
	}
	 
	/**
	 * @inheritdoc
	 */
	insert(values, columns = []) {
		var rowObj = {};
		if (this.schema.fields) {
			var schemaColumns = Object.keys(this.schema.fields);
			if (columns.length) {
				var unknownFields = columns.filter(col => schemaColumns.indexOf(col) === -1);
				if (unknownFields.length) {
					throw new Error('Unknown column(s): ' + unknownFields.join(', '));
				}
			} else {
				columns = schemaColumns;
			}
		} else {
			var schemaColumns = columns;
		}
		if (columns.length !== values.length) {
			throw new Error('Column/values count mismatch!');
		}
		schemaColumns.forEach(schemaColumnName => {
			var keyColumnPosition = columns.indexOf(schemaColumnName);
			if (keyColumnPosition === -1) {
				rowObj[schemaColumnName] = this.schema.fields && _isObject(this.schema.fields[schemaColumnName]) 
					? this.schema.fields[schemaColumnName].default : null;
			} else {
				rowObj[schemaColumnName] = values[keyColumnPosition];
			}
		});
		this.rows.push(rowObj);
	}
};

/**
 * @exports
 */
export default Table;
