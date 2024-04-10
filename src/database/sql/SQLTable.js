
/**
 * @imports
 */
import _isObject from '@webqit/util/js/isObject.js';
import _isNull from '@webqit/util/js/isNull.js';
import _arrFrom from '@webqit/util/arr/from.js';
import _isNumeric from '@webqit/util/js/isNumeric.js';
import _wrapped from '@webqit/util/str/wrapped.js';
import _Table from '../_Table.js';
import SQLInsertQueryInspector from './SQLInsertQueryInspector.js';
import SQLDeleteQueryInspector from './SQLDeleteQueryInspector.js';
import SQLCursor from './SQLCursor.js';

/**
 * ---------------------------
 * SQLTable class
 * ---------------------------
 */

export default class SQLTable extends _Table {

	/**
	 * Returns a cursor.
	 * 
	 * @return SQLCursor
	 */
	getCursor() { return new SQLCursor(this); }
	 
	/**
	 * @inheritdoc
	 */
	async getAll() {
		return new Promise((resolve, reject) => {
			this.database.client.driver.query(`SELECT * FROM ${ this.database.name }.${ this.name }`, (err, result) => {
				if (err) return reject(err);
				resolve((result.rows || result));
			});
		});
	}
	 
	/**
	 * @inheritdoc
	 */
	async get(primaryKey) {
		const primaryKeyColumns = this.getPrimaryKeyColumns();
		if (primaryKeyColumns.length !== 1) {
			throw new Error('Cannot find records by primary key on a table with zero or multiple primary keys.');
		}
		return new Promise((resolve, reject) => {
			this.database.client.driver.query(`SELECT * FROM ${ this.database.name }.${ this.name } WHERE ${ primaryKeyColumns[0] } = ?`, [primaryKey], (err, result) => {
				if (err) return reject(err);
				resolve((result.rows || result)[0]);
			});
		});
	}
	
	/**
	 * @inheritdoc
	 */
	async count(query = '*') {
		return new Promise((resolve, reject) => {
			this.database.client.driver.query(`SELECT COUNT(${ query }) AS c FROM ${ this.database.name }.${ this.name }`, (err, result) => {
				if (err) return reject(err);
				resolve((result.rows || result)[0].c);
			});
		});
	}
	
	/**
	 * @inheritdoc
	 */
	async addAll(entries, columns = [], duplicateKeyCallback = null) {
		if (!entries.length) return;
		var duplicateKeyUpdateObj = {};
		if (!columns.length) {
			if (_isObject(entries[0])) {
				columns = Object.keys(entries[0]);
			} else {
				const schema = await this.database.describeTable(this.name);
				columns = Object.keys(schema.columns);
			}
		}		
		return new Promise((resolve, reject) => {
			let insertSql = `INSERT INTO ${ this.database.name }.${ this.name }\n\t${ columns.length ? `(${ columns.join(',') })\n\t` : '' }`;
			insertSql += 'VALUES' + "\r\n" + entries.map(row => formatAddRow(Object.values(row))).join(",\r\n") + "\r\n";
			if (duplicateKeyCallback) {
				duplicateKeyCallback(duplicateKeyUpdateObj);
				insertSql += ' ON DUPLICATE KEY UPDATE ' + formatAssignments(duplicateKeyUpdateObj);
			}
			this.database.client.driver.query(insertSql, (err, result) => {
				if (err) return reject(err);
				resolve(new SQLInsertQueryInspector(
					this, 
					result, 
					columns, 
					entries, 
					duplicateKeyUpdateObj
				));
			});
		});
	}

	/**
	 * @inheritdoc
	 */
	async add(rowObj) {
		return new Promise((resolve, reject) => {
			let insertSql = `INSERT INTO ${ this.database.name }.${ this.name }\n\t(${ Object.keys(rowObj).join(',') })\n\t`;
			insertSql += `VALUES\n\t${ formatAddRow(Object.values(rowObj)) }`;
			this.database.client.driver.query(insertSql, (err, result) => {
				if (err) return reject(err);
				resolve(new SQLInsertQueryInspector(
					this,
					result,
					Object.keys(rowObj), 
					Object.values(rowObj), 
				));
			});
		});
	}
	
	/**
	 * @inheritdoc
	 */
	async putAll(rowObjs) {
		await Promise.all(rowObjs.map(rowObj => this.put(rowObj)));
		return new SQLInsertQueryInspector(
			this, 
			{}, 
			Object.keys(rowObjs[0]), 
			rowObjs, 
		);
	}

	/**
	 * @inheritdoc
	 */
	async put(rowObj) {
		return new Promise((resolve, reject) => {
			const putSql = `INSERT INTO ${ this.database.name }.${ this.name }\n\t${ formatPutRow(rowObj) }`;
			this.database.client.driver.query(putSql, (err, result) => {
				if (err) return reject(err);
				resolve(new SQLInsertQueryInspector(
					this, 
					result, 
					Object.keys(rowObj), 
					Object.values(rowObj), 
				));
			});
		});
	}
	
	/**
	 * @inheritdoc
	 */
	async deleteAll(IDs = []) {
		const driver = this.database.client.driver;
		return new Promise((resolve, reject) => {
			const deleteSql = `DELETE FROM ${ this.database.name }.${ this.name }${ IDs.length ? ` WHERE id in (${ IDs.join(', ') })` : ''}`;
			this.database.client.driver.query(deleteSql, (err, result) => {
				if (err) return reject(err);
				resolve(new SQLDeleteQueryInspector(
					this,
					result
				));
			});
		});
	}

	/**
	 * @inheritdoc
	 */
	async delete(primaryKey) {
		const primaryKeyColumns = this.getPrimaryKeyColumns();
		if (primaryKeyColumns.length !== 1) {
			throw new Error('Cannot delete records by primary key on a table with zero or multiple primary keys.');
		}
		return new Promise((resolve, reject) => {
			const deleteSql = `DELETE FROM ${ this.database.name }.${ this.name } WHERE ${ primaryKeyColumns[0] } = ?`;
			this.database.client.driver.query(deleteSql, [primaryKey], (err, result) => {
				if (err) return reject(err);
				resolve(new SQLDeleteQueryInspector(
					this,
					result
				));
			});
		});
	}

}

/**
 * --------
 * HELPERS
 * --------
 */
const isJSON = str => _wrapped(str, '{', '}') || _wrapped(str, '[', ']');
const formatVal = val => {
	if (val instanceof Date) {
		try {
			return "'" + val.toISOString().split('.')[0] + "'";
		} catch(e) {
			return 'NULL';
		}
	}
	return _isNumeric(val) ? val : (_isNull(val) ? 'NULL' : "'" + val + "'");
};
const formatAssignments = rowObj => Object.keys(rowObj).map(key => '`' + key + '` = ' + formatVal(rowObj[key])).join(', ');
const formatAddRow = values => '(' + values.map(formatVal).join(', ') + ')';
const formatPutRow = rowObj => {
	var assignments = formatAssignments(rowObj);
	return 'SET ' + assignments + ' ON DUPLICATE KEY UPDATE ' + assignments;
};

