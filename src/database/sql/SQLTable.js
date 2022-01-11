
/**
 * @imports
 */
import _isObject from '@webqit/util/js/isObject.js';
import _isNull from '@webqit/util/js/isNull.js';
import _arrFrom from '@webqit/util/arr/from.js';
import _isNumeric from '@webqit/util/js/isNumeric.js';
import _wrapped from '@webqit/util/str/wrapped.js';
import _Table from '../_Table.js';
import SQLCursor from './SQLCursor.js';
import SQLInsertQueryInspector from './SQLInsertQueryResult.js';
import SQLDeleteQueryInspector from './SQLDeleteQueryResult.js';

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
	getCursor() {
		return new SQLCursor(this);
	}
	 
	/**
	 * @inheritdoc
	 */
	async getAll() {
		var conn = await this.database.driver.getConnection();
		return new Promise((resolve, reject) => {
			conn.query('SELECT * FROM ' + this.name, (err, result) => {
				if (err) return reject(err);
				resolve(result);
			});
		});
	}
	 
	/**
	 * @inheritdoc
	 */
	async get(primaryKey) {
		var conn = await this.database.driver.getConnection();
		var primaryKeyColumns = this.getPrimaryKeyColumns();
		if (primaryKeyColumns.length !== 1) {
			throw new Error('Cannot find records by primary key on a table with zero or multiple primary keys.');
		}
		return new Promise((resolve, reject) => {
			conn.query('SELECT * FROM ' + this.name + ' WHERE `' + primaryKeyColumns[0] + '` = ?', [primaryKey], (err, result) => {
				if (err) return reject(err);
				resolve(result[0]);
			});
		});
	}
	
	/**
	 * @inheritdoc
	 */
	async count(query = '*') {
		var conn = await this.database.driver.getConnection();
		return new Promise((resolve, reject) => {
			conn.query('SELECT COUNT(' + query + ') AS c FROM ' + this.name, (err, result) => {
				if (err) return reject(err);
				resolve(result[0].c);
			});
		});
	}
	
	/**
	 * @inheritdoc
	 */
	async addAll(entries, columns = [], duplicateKeyCallback = null) {
		if (!entries.length) {
			return;
		}
		var duplicateKeyUpdateObj = {};
		if (!columns.length) {
			if (_isObject(entries[0])) {
				columns = Object.keys(entries[0]);
			} else {
				columns = Object.keys(this.def.schema.columns);
			}
		}		
		var conn = await this.database.driver.getConnection();
		return new Promise((resolve, reject) => {
			var insertSql = 'INSERT INTO `' + this.name + '`' + "\r\n" + (columns.length ? '(`' + columns.join('`, `') + '`)' + "\r\n" : '');
			insertSql += 'VALUES' + "\r\n" + entries.map(row => formatAddRow(Object.values(row))).join(",\r\n") + "\r\n";
			if (duplicateKeyCallback) {
				duplicateKeyCallback(duplicateKeyUpdateObj);
				insertSql += ' ON DUPLICATE KEY UPDATE ' + formatAssignments(duplicateKeyUpdateObj);
			}
			conn.query(insertSql, (err, result) => {
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
		var conn = await this.database.driver.getConnection();
		return new Promise((resolve, reject) => {
			var insertSql = 'INSERT INTO `' + this.name + '`' + "\r\n" + '(`' + Object.keys(rowObj).join('`, `') + '`)' + "\r\n";
			insertSql += 'VALUES' + "\r\n" + formatAddRow(Object.values(rowObj));
			conn.query(insertSql, (err, result) => {
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
		var conn = await this.database.driver.getConnection();
		return new Promise((resolve, reject) => {
			var putSql = 'INSERT INTO `' + this.name + '`' + "\r\n" + formatPutRow(rowObj);
			conn.query(putSql, (err, result) => {
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
		var conn = await this.database.driver.getConnection();
		return new Promise((resolve, reject) => {
			var deleteSql = 'DELETE FROM `' + this.name + '`' + (IDs.length ? ' WHERE id in (' + IDs.join(', ') + ')' : '');
			conn.query(deleteSql, (err, result) => {
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
		var conn = await this.database.driver.getConnection();
		var primaryKeyColumns = this.getPrimaryKeyColumns();
		if (primaryKeyColumns.length !== 1) {
			throw new Error('Cannot delete records by primary key on a table with zero or multiple primary keys.');
		}
		return new Promise((resolve, reject) => {
			var deleteSql = 'DELETE FROM `' + this.name + '` WHERE `' + primaryKeyColumns[0] + '` = ?';
			conn.query(deleteSql, [primaryKey], (err, result) => {
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

