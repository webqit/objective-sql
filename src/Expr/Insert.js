
/**
 * @imports
 */
import _wrapped from '@web-native-js/commons/str/wrapped.js';
import _unwrap from '@web-native-js/commons/str/unwrap.js';
import _intersect from '@web-native-js/commons/arr/intersect.js';
import Lexer from '@web-native-js/commons/str/Lexer.js';
import InsertInterface from './InsertInterface.js';
import { Assignment } from '@web-native-js/jsen';
import Reference from './Reference.js';
import Assertion from './Assertion.js';
import Comparison from './Comparison.js';
import Base from '../Base/Base.js';
import Table from './Table.js';
import Val from './Val.js';

/**
 * ---------------------------
 * Insert class
 * ---------------------------
 */				

export default class Insert extends InsertInterface {
	 
	/**
	 * @inheritdoc
	 */
	constructor(table, columns, values, withUac, insertType, onDuplicateKeyUpdate) {
		super();
		this.table = table;
		this.columns = columns;
		this.values = values;
		this.withUac = withUac;
		this.insertType = insertType;
		this.onDuplicateKeyUpdate = onDuplicateKeyUpdate;
	}
	 
	/**
	 * @inheritdoc
	 */
	eval(database, params = {}) {
		var tableBase = this.table.eval(database, params);
		var tableSchema = this.table.getSchema();
		// ---------------------------
		var values = this.values;
		var insertType = this.insertType.toUpperCase();
		if (insertType === 'SET') {
			var columns = values.map(assignment => assignment.reference.name);
			values = [values.map(assignment => assignment.val)];
		} else {
			if (insertType === 'SELECT') {
				try {
					values = values.eval(database, params).map(row => Object.values(row));
				} catch(e) {
					throw new Error('["' + values.toString() + '" in SELECT clause]: ' + e.message);
				}
			}
			var columns = this.columns || (tableSchema.fields ? Object.keys(tableSchema.fields) : []);
		}
		columns = columns.map(c => c + '');
		var uniqueKeys = _intersect(tableSchema.uniqueKeys, columns);
		var rowCount = 0;
		var rowArr = null;
		while (rowArr = values.shift()) {
			// ------------------------
			// HANDLE ON_DUPLICATE_KEY_UPDATE
			// ------------------------
			var duplicateKeyUpdateCount = 0;
			if (uniqueKeys.length) {
				// Generate a comparisons list on values going into unique keys
				var comparisons = uniqueKeys.map(columnName => {
					var keyColumnPosition = columns.indexOf(columnName);
					var valueExpr = insertType === 'SELECT' 
						? new Val(rowArr[keyColumnPosition]) 
						: rowArr[keyColumnPosition]/*Still a parse object*/;
					var nameExpr = new Reference(null, columnName);
					nameExpr.parseCallback = this.parseCallback;
					return new Comparison(nameExpr, valueExpr, '=');
				});
				// Generate the assertion
				var where = new Assertion(comparisons, Assertion.operators.or);
				var base = new Base(params, this.table.eval(database, params), where);
				var rowBase;
				while (rowBase = base.fetch()) {
					if (!this.onDuplicateKeyUpdate) {
						throw new Error('Inserting duplicate values on unique keys: ' + uniqueKeys.join(', '));
					}
					this.onDuplicateKeyUpdate.forEach(assignment => assignment.eval(rowBase, params));
					duplicateKeyUpdateCount ++;
				}
				rowCount += duplicateKeyUpdateCount;
			}
			// ------------------------
			// HANDLE INSERT
			// ------------------------
			if (!duplicateKeyUpdateCount) {
				if (insertType !== 'SELECT') {
					rowArr = rowArr.map(val => val.eval(database, params));
				}
				tableBase.insert(rowArr, columns);
				rowCount ++;
			}
		}
		return rowCount;
	}
	
	/**
	 * @inheritdoc
	 */
	toString(context = null) {
		var str = [this.table.toString(context)];
		if (this.insertType.toUpperCase() === 'SET') {
			str.push('SET ' + this.values.map(assignment => assignment.toString(context)).join(', '));
		} else {
			if (this.columns) {
				str.push('(' + this.columns.join(', ') + ')');
			}
			if (this.insertType.toUpperCase() === 'SELECT') {
				str.push(this.values.toString(context));
			} else {
				str.push('VALUES (' + this.values.map(
					row => row.map(
						val => val.toString(context)
					).join(', ')
				).join('), (') + ')');
			}
		}
		if (this.onDuplicateKeyUpdate) {
			str.push('ON DUPLICATE KEY UPDATE ' + this.onDuplicateKeyUpdate.map(assignment => assignment.toString(context)).join(', '));
		}
		return 'INSERT INTO ' + str.join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}) {
		if (expr.trim().match(/^INSERT([ ]+WITH[ ]+UAC)?([ ]+INTO)?/, 'i')) {
			var withUac = false;
			if (expr.match(/INSERT[ ]+WITH[ ]+UAC/i)) {
				withUac = true;
				expr = expr.replace(/[ ]+WITH[ ]+UAC/i, '');
			}
			var parse = Lexer.lex(expr, Object.values(Insert.clauses), {useRegex:'i'});
			parse.tokens.shift();
			var table = parse.tokens.shift().trim();
			var columns = [];
			var values = parse.tokens.shift();
			var insertType = parse.matches[1].toUpperCase();
			if (insertType === 'SET') {
				table = parseCallback(table, [Table]);
				values = Lexer.split(values.trim(), [','])
					.map(e => parseCallback(e.trim(), [Assignment]));
			} else {
				var tableColumnSplit = Lexer.split(table, [' ']);
				table = parseCallback(tableColumnSplit.shift().trim(), [Table]);
				if (tableColumnSplit.length) {
					columns = tableColumnSplit[0].trim();
					columns = Lexer.split(_wrapped(columns, '(', ')') ? _unwrap(columns, '(', ')') : columns, [','])
						.map(c => c.trim());
				}
				if (insertType === 'SELECT') {
					values = parseCallback('SELECT ' + values.trim());
				} else {
					// insertType === 'VALUES' || insertType === 'VALUE'
					values = Lexer.split(values.trim(), [','])
						.map(row => Lexer.split(_unwrap(row.trim(), '(', ')'), [','])
							.map(val => parseCallback(val.trim())));
				}
			}
			var onDuplicateKeyUpdate = parse.tokens.shift();
			if (onDuplicateKeyUpdate) {
				onDuplicateKeyUpdate = Lexer.split(onDuplicateKeyUpdate.trim(), [','])
					.map(assignment => parseCallback(assignment.trim(), [Assignment]));
			}
			var instance = new this(table, columns, values, withUac, insertType, onDuplicateKeyUpdate);
			instance.parseCallback = parseCallback;
			return instance;
		}
	}
};

/**
 * @prop object
 */
Insert.clauses = {
	table: 'INSERT([ ]+INTO)?',
	values: '(VALUES|VALUE|SET|SELECT)',
	update: 'ON[ ]+DUPLICATE[ ]+KEY[ ]+UPDATE',
};