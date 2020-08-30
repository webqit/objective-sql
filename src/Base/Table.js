
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

export default class Table extends FetchInterface {
	 
	/**
	 * @inheritdoc
	 */
	constructor(rows, alias, schema) {
		super();
		this.rows = rows;
		this.alias = alias;
		this.schema = schema;
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