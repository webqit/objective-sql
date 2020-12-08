
/**
 * @imports
 */
import _isObject from '@webqit/util/js/isObject.js';
import _isNull from '@webqit/util/js/isNull.js';
import _isNumeric from '@webqit/util/js/isNumeric.js';
import _Store from '../_Store.js';
import SQLCursor from './SQLCursor.js';

/**
 * ---------------------------
 * SQLStore class
 * ---------------------------
 */

export default class SQLStore extends _Store {

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
	getAll() {
		return new Promise((resolve, reject) => {
			this.store.database.conn.query('SELECT * FROM ' + this.store.name, (err, result) => {
				if (err) return reject(err);
				resolve(result);
			});
		});
	}
	 
	/**
	 * @inheritdoc
	 */
	get(primaryKey) {
		return new Promise((resolve, reject) => {
			this.store.database.conn.query('SELECT * FROM ' + this.store.name + ' WHERE `' + this.schema.primaryKey + '` = ?', [primaryKey], (err, result) => {
				if (err) return reject(err);
				resolve(result[0]);
			});
		});
	}
	
	/**
	 * @inheritdoc
	 */
	count(query = '*') {
		return new Promise((resolve, reject) => {
			this.store.database.conn.query('SELECT COUNT(' + query + ') AS c FROM ' + this.store.name, (err, result) => {
				if (err) return reject(err);
				resolve(result[0].c);
			});
		});
	}
	
	/**
	 * @inheritdoc
	 */
	addAll(multiValues, columns = [], duplicateKeyCallback = null) {
		if (!multiValues.length) {
			return;
		}
		if (!columns.length) {
			if (_isObject(multiValues[0])) {
				columns = Object.keys(multiValues[0]);
			} else {
				columns = Object.keys(this.schema.fields);
			}
		}
		return new Promise((resolve, reject) => {
			var insertSql = 'INSERT INTO `' + this.store.name + '`' + "\r\n" + '(`' + columns.join('`, `') + '`)' + "\r\n";
			insertSql += 'VALUES' + "\r\n" + multiValues.map(row => formatAddRow(Object.values(row))).join(",\r\n") + "\r\n";
			if (duplicateKeyCallback) {
				var duplicateKeyObj = {};
				duplicateKeyCallback(duplicateKeyObj);
				insertSql += ' ON DUPLICATE KEY UPDATE ' + formatAssignments(duplicateKeyObj);
			}
			this.store.database.conn.query(insertSql, (err, result) => {
				if (err) return reject(err);
				resolve(result);
			});
		});
	}

	/**
	 * @inheritdoc
	 */
	add(rowObj) {
		return new Promise((resolve, reject) => {
			var insertSql = 'INSERT INTO `' + this.store.name + '`' + "\r\n" + '(`' + Object.keys(rowObj).join('`, `') + '`)' + "\r\n";
			insertSql += 'VALUES' + "\r\n" + formatAddRow(Object.values(rowObj));
			this.store.database.conn.query(insertSql, (err, result) => {
				if (err) return reject(err);
				resolve(result);
			});
		});
	}
	
	/**
	 * @inheritdoc
	 */
	putAll(rowObjs) {
		return Promise.all(rowObjs.map(rowObj => this.put(rowObj)));
	}

	/**
	 * @inheritdoc
	 */
	put(rowObj) {
		return new Promise((resolve, reject) => {
			var putSql = 'INSERT INTO `' + this.store.name + '`' + "\r\n" + formatPutRow(rowObj);
			this.store.database.conn.query(putSql, (err, result) => {
				if (err) return reject(err);
				resolve(result);
			});
		});
	}
	
	/**
	 * @inheritdoc
	 */
	deleteAll() {
		return new Promise((resolve, reject) => {
			var deleteSql = 'DELETE FROM `' + this.store.name + '`';
			this.store.database.conn.query(deleteSql, (err, result) => {
				if (err) return reject(err);
				resolve(result);
			});
		});
	}

	/**
	 * @inheritdoc
	 */
	delete(primaryKey) {
		return new Promise((resolve, reject) => {
			var deleteSql = 'DELETE FROM `' + this.store.name + '` WHERE `' + this.schema.primaryKey + '` = ?';
			this.store.database.conn.query(deleteSql, [primaryKey], (err, result) => {
				if (err) return reject(err);
				resolve(result);
			});
		});
	}

};

/**
 * --------
 * HELPERS
 * --------
 */
const formatVal = val => val instanceof Date ? '"' + val.toISOString().split('.')[0] + '"' : (_isNumeric(val) ? val : (_isNull(val) ? 'NULL' : '"' + val + '"'));
const formatAssignments = rowObj => Object.keys(rowObj).map(key => '`' + key + '` = ' + formatVal(rowObj[key])).join(', ');
const formatAddRow = values => '(' + values.map(formatVal).join(', ') + ')';
const formatPutRow = rowObj => {
	var assignments = formatAssignments(rowObj);
	return 'SET ' + assignments + ' ON DUPLICATE KEY UPDATE ' + assignments;
};
