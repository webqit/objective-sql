
/**
 * @imports
 */
import _wrapped from '@onephrase/util/str/wrapped.js';
import _unwrap from '@onephrase/util/str/unwrap.js';
import Lexer from '@onephrase/util/str/Lexer.js';
import InsertInterface from './InsertInterface.js';
import { Assignment } from '@web-native-js/jsen';
import Table from '../Expr/Table.js';

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
	async eval(context, params = {}) {
		var _params = {...params};
		_params.mode = 'readwrite';
		var tableBase = await this.table.eval(context, _params);
		var tableSchema = tableBase.schema;
		// ---------------------------
		var values = this.values;
		var insertType = this.insertType.toUpperCase();
		if (insertType === 'SET') {
			var columns = values.map(assignment => assignment.reference.name);
			values = [values.map(assignment => assignment.val.eval({}, params))];
		} else {
			var columns = this.columns || (tableSchema.fields ? Object.keys(tableSchema.fields) : []);
			if (insertType === 'SELECT') {
				try {
					values = (await values.eval(context, params)).map(row => Object.values(row));
				} catch(e) {
					throw new Error('["' + values.stringify() + '" in SELECT clause]: ' + e.message);
				}
			} else if (insertType === 'VALUES') {
				values = values.map(row => row.map(val => val.eval({}, params)));
			} else {
				throw new Error('Invalid insert statement "' + this + '"!');
			}
		}
		columns = columns.map(c => c + '');

		var keys = await tableBase.addAll(values, columns, newRow => {
			if (this.onDuplicateKeyUpdate) {
				this.onDuplicateKeyUpdate.forEach(assignment => assignment.eval({$: newRow}, params));
				return true
			}
		});

		return {
			table: tableBase.name,
			keys,
		};
	}
	
	/**
	 * @inheritdoc
	 */
	toString() {
		return this.stringify();
	}
	
	/**
	 * @inheritdoc
	 */
	stringify(params = {}) {
		var str = [this.table.stringify(params)];
		if (this.insertType.toUpperCase() === 'SET') {
			str.push('SET ' + this.values.map(assignment => assignment.stringify(params)).join(', '));
		} else {
			if (this.columns) {
				str.push('(' + this.columns.join(', ') + ')');
			}
			if (this.insertType.toUpperCase() === 'SELECT') {
				str.push(this.values.stringify(params));
			} else {
				str.push('VALUES (' + this.values.map(
					row => row.map(
						val => val.stringify(params)
					).join(', ')
				).join('), (') + ')');
			}
		}
		if (this.onDuplicateKeyUpdate) {
			str.push('ON DUPLICATE KEY UPDATE ' + this.onDuplicateKeyUpdate.map(assignment => assignment.stringify(params)).join(', '));
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