
/**
 * @imports
 */
import _wrapped from '@webqit/util/str/wrapped.js';
import _unwrap from '@webqit/util/str/unwrap.js';
import Lexer from '@webqit/util/str/Lexer.js';
import InsertInterface from './InsertInterface.js';
import { Assignment } from '@webqit/subscript/src/grammar.js';
import Table from '../grammar/Table.js';

/**
 * ---------------------------
 * Insert class
 * ---------------------------
 */				

export default class Insert extends InsertInterface {
	 
	/**
	 * @inheritdoc
	 */
	constructor(TABLE_REFERENCES, COLUMNS_LIST, VALUES_LIST, WITH_UAC, IGNORE, INSERT_TYPE, UPDATE_CLAUSE) {
		super();
		this.TABLE_REFERENCES = TABLE_REFERENCES;
		this.COLUMNS_LIST = COLUMNS_LIST;
		this.VALUES_LIST = VALUES_LIST;
		this.WITH_UAC = WITH_UAC;
		this.IGNORE = IGNORE;
		this.INSERT_TYPE = INSERT_TYPE;
		this.UPDATE_CLAUSE = UPDATE_CLAUSE;
	}
	 
	/**
	 * @inheritdoc
	 */
	async eval(context, params = {}) {
		var _params = {...params};
		_params.mode = 'readwrite';
		var tableBase = await this.TABLE_REFERENCES.eval(context, _params);
		var tableSchema = tableBase.schema;
		// ---------------------------
		var values = this.VALUES_LIST;
		var insertType = this.INSERT_TYPE.toUpperCase();
		var forceAutoIncrement = insertType === 'TABLE';
		if (insertType === 'SET') {
			var columns = values.map(assignment => assignment.reference.name);
			values = [values.map(assignment => assignment.val.eval({}, params))];
		} else {
			var columns = this.COLUMNS_LIST || (tableSchema.fields ? Object.keys(tableSchema.fields) : []);
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

		var duplicateKeyCallback = this.UPDATE_CLAUSE ? newRow => {
			var _params = {...params};
			_params.strictMode = false;
			this.UPDATE_CLAUSE.forEach(assignment => assignment.eval({$: newRow}, _params));
			return true
		} : (this.IGNORE ? () => false : null);
		var keys = await tableBase.addAll(values, columns, duplicateKeyCallback, forceAutoIncrement);

		return {
			[tableBase.name]: keys,
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
		// ---------------------
		var t = params.t || 0, _t = (n = 0) => !params.formatted ? '' : ("\r\n" + ("\t".repeat(Math.max(0, t + n)))), _params = {...params}; _params.t = t + 1;
		// ---------------------
		var str = [this.TABLE_REFERENCES.stringify(_params)];
		if (this.INSERT_TYPE.toUpperCase() === 'SET') {
			str.push(_t(1) + 'SET ' + this.VALUES_LIST.map(assignment => assignment.stringify(_params)).join(', '));
		} else {
			if (this.COLUMNS_LIST.length) {
				str.push('(' + this.COLUMNS_LIST.join(', ') + ')');
			}
			if (this.INSERT_TYPE.toUpperCase() === 'SELECT') {
				str.push(this.VALUES_LIST.stringify(_params));
			} else {
				str.push(_t() + 'VALUES ' + _t(1) + '(' + this.VALUES_LIST.map(
					row => row.map(
						val => val.stringify(_params)
					).join(', ')
				).join('), ' + _t(1) + '(') + ')');
			}
		}
		if (this.UPDATE_CLAUSE) {
			str.push(_t() + 'ON DUPLICATE KEY UPDATE ' + this.UPDATE_CLAUSE.map(assignment => assignment.stringify(_params)).join(', '));
		}
		return 'INSERT ' + (this.IGNORE ? 'IGNORE ' : '') + 'INTO ' + str.join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}) {
		if (expr.trim().match(/^INSERT([ ]+WITH[ ]+UAC)?([ ]+IGNORE)?([ ]+INTO)?/, 'i')) {
			var withUac = false, ignore = false;
			if (expr.match(/INSERT[ ]+WITH[ ]+UAC/i)) {
				withUac = true;
				expr = expr.replace(/[ ]+WITH[ ]+UAC/i, '');
			}
			if (expr.match(/INSERT[ ]+IGNORE/i)) {
				ignore = true;
				expr = expr.replace(/[ ]+IGNORE/i, '');
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
			var instance = new this(table, columns, values, withUac, ignore, insertType, onDuplicateKeyUpdate);
			instance.parseCallback = parseCallback;
			return instance;
		}
	}
}

/**
 * @prop object
 */
Insert.clauses = {
	TABLE_REFERENCES: 'INSERT([ ]+IGNORE)?([ ]+INTO)?',
	VALUES_LIST: '(VALUES|VALUE|SET|SELECT)',
	UPDATE_CLAUSE: 'ON[ ]+DUPLICATE[ ]+KEY[ ]+UPDATE',
};