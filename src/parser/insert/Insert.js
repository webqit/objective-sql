
import { _wrapped, _unwrap } from '@webqit/util/str/index.js';
import Lexer from '@webqit/util/str/Lexer.js';
import StatementNode from '../StatementNode.js';
import Assignment from '../update/Assignment.js';
import Table from '../select/Table.js';

export default class Insert extends StatementNode {
	 
	/**
	 * Instance properties
	 */

	/**
	 * @constructor
	 */
	constructor(context, insertType) {
		super(context);
		this.INSERT_TYPE = insertType;
		this.TABLE_REFERENCES = [];
		this.COLUMNS_LIST = [];
		this.VALUES_LIST = [];
		this.UPDATE_CLAUSE = [];
	}

	table(...tables) {
		if (!tables.length) return this.TABLE_REFERENCES;
		this.TABLE_REFERENCES.push(...tables);
		return this;
	}

	columns(...columns) {
		if (!columns.length) return this.COLUMNS_LIST;
		this.COLUMNS_LIST.push(...columns);
		return this;
	}

	values(...values) {
		if (!values.length) return this.VALUES_LIST;
		this.VALUES_LIST.push(...values);
		return this;
	}

	onDuplicateKeyUpdate(updateClause) {
		if (!arguments.length) return this.UPDATE_CLAUSE;
		this.UPDATE_CLAUSE = updateClause;
		return this;
	}
	 
	/**
	 * @inheritdoc
	 */
	async eval(context, params = {}) {
		var _params = {...params};
		_params.mode = 'readwrite';
		var tableBase = await this.TABLE_REFERENCES.eval(context, _params);
		var tableSchema = tableBase.def.schema;
		// ---------------------------
		var values = this.VALUES_LIST;
		var insertType = this.INSERT_TYPE.toUpperCase();
		var forceAutoIncrement = insertType === 'TABLE';
		if (insertType === 'SET') {
			var columns = values.map(assignment => assignment.reference.name);
			values = [values.map(assignment => assignment.val.eval({}, params))];
		} else {
			var columns = this.COLUMNS_LIST || (tableSchema.columns ? Object.keys(tableSchema.columns) : []);
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
	static async parse(context, expr, parseCallback) {
		if (!expr.trim().match(/^INSERT([ ]+WITH[ ]+UAC)?([ ]+IGNORE)?([ ]+INTO)?/, 'i')) return;
		let WITH_UAC = false, ignore = false;
		if (expr.match(/INSERT[ ]+WITH[ ]+UAC/i)) {
			WITH_UAC = true;
			expr = expr.replace(/[ ]+WITH[ ]+UAC/i, '');
		}
		if (expr.match(/INSERT[ ]+IGNORE/i)) {
			ignore = true;
			expr = expr.replace(/[ ]+IGNORE/i, '');
		}
		const parse = Lexer.lex(expr, Object.values(Insert.clauses), {useRegex:'i'});
		parse.tokens.shift();
		let table = parse.tokens.shift().trim();
		const columns = [];
		let values = parse.tokens.shift();
		const insertType = parse.matches[1].toUpperCase();
		const instance = new this(context, insertType, { WITH_UAC, ignore });
		if (insertType === 'SET') {
			table = await parseCallback(instance, table, [Table]);
			values = await Promise.all(Lexer.split(values.trim(), [','])
				.map(e => parseCallback(instance, e.trim(), [Assignment])));
		} else {
			const tableColumnSplit = Lexer.split(table, [' ']);
			table = await parseCallback(instance, tableColumnSplit.shift().trim(), [Table]);
			if (tableColumnSplit.length) {
				columns = tableColumnSplit[0].trim();
				columns = Lexer.split(_wrapped(columns, '(', ')') ? _unwrap(columns, '(', ')') : columns, [','])
					.map(c => c.trim());
			}
			if (insertType === 'SELECT') {
				values = await parseCallback(instance, 'SELECT ' + values.trim());
			} else {
				// insertType === 'VALUES' || insertType === 'VALUE'
				values = await Promise.all(Lexer.split(values.trim(), [','])
					.map(row => Lexer.split(_unwrap(row.trim(), '(', ')'), [','])
						.map(val => parseCallback(instance, val.trim()))));
			}
		}
		let onDuplicateKeyUpdate = parse.tokens.shift();
		if (onDuplicateKeyUpdate) {
			onDuplicateKeyUpdate = await Promise.all(Lexer.split(onDuplicateKeyUpdate.trim(), [','])
				.map(assignment => parseCallback(instance, assignment.trim(), [Assignment])));
		}
		instance.table(table).columns(...columns).values(...values).onDuplicateKeyUpdate(onDuplicateKeyUpdate);
		instance.parseCallback = parseCallback;
		return instance;
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