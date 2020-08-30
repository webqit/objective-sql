
/**
 * @imports
 */
import {
	AbstractionInterface,
	ReferenceInterface,
} from '../index.js';
import _isArray from '@web-native-js/commons/js/isArray.js';
import _objFrom from '@web-native-js/commons/obj/from.js';
import _copy from '@web-native-js/commons/obj/copy.js';
import _each from '@web-native-js/commons/obj/each.js';
import Lexer from '@web-native-js/commons/str/Lexer.js';
import SelectInterface from './SelectInterface.js';
import TableInterface from './TableInterface.js';
import UnionInterface from './UnionInterface.js';
import DerivedTableBase from '../Base/DerivedTable.js';
import TableBase from '../Base/Table.js';
import UACClient from '../Uac/Client.js';
import Schema from '../Schema.js';

/**
 * ---------------------------
 * Table class
 * ---------------------------
 */				

export default class Table extends TableInterface {
	
	/**
	 * @inheritdoc
	 */
	constructor(expr, alias, claused = false) {
		super();
		// ReferenceInterface or AbstractionInterface
		this.expr = expr;
		this.alias = alias;
		this.claused = claused;
	}
	
	/**
	 * @inheritdoc
	 */
	eval(database = null, params = {}) {
		// Derived table???
		if (this.expr instanceof AbstractionInterface) {
			var _params = _copy(params);
			_params.fieldsByReference = true;
			return new DerivedTableBase(this.expr/*ABS*/.expr/*SELECT*/.eval(database, _params), this.alias, this.getSchema());
		}
		if (this.expr instanceof ReferenceInterface) {
			// We must eval() without context...
			if (this.expr.context) {
				var tableData = this.expr.eval(_objFrom(this.expr.context.name, database), params);
			} else {
				var tableData = this.expr.eval(database, params);
			}
			if (!_isArray(tableData)) {
				throw new Error('Table "' + this.getName() + '" could not be initialized!');
			}
			// + this.expr.name does not have any backticka problem
			return new TableBase(tableData, this.getAlias(), this.getSchema());
		}
	}
	
	/**
	 * @inheritdoc
	 */
	toString(context = null) {
		return [this.expr.toString(context), this.claused ? 'AS' : '', this.alias].filter(a => a).join(' ');
	}
	
	/**
	 * --------------
	 */
	
	/**
	 * @inheritdoc
	 */
	as(alias) {
		this.alias = alias;
		this.claused = true;
		return this;
	}
	
	/**
	 * @inheritdoc
	 */
	getName() {
		// Without backticks
		return this.expr.name || '';
	}

	/**
	 * @inheritdoc
	 */
	getAlias() {
		return this.alias || this.getName();
	}
	
	/**
	 * @inheritdoc
	 */
	getSchema() {
		if (this.expr instanceof AbstractionInterface) {
			var derivedQuery = this.expr/*ABS*/.expr/*SELECT*/;
			var derivedTable = derivedQuery.getTable();
			var derivedTableSchema = (_isArray(derivedTable) ? derivedTable[0] : derivedTable).getSchema();
			var derivedTableSchemaAliased = {
				fields: {},
				uniqueKeys: [],
			};
			derivedTableSchemaAliased.name = this.getAlias();
			// RUNTIME FIELDS
			derivedQuery.getFields().forEach(field => {
				derivedTableSchemaAliased.fields[field.getAlias()] = derivedTableSchema.fields[field.getName()];
				if (derivedTableSchema.uniqueKeys.includes(field.getName())) {
					derivedTableSchemaAliased.uniqueKeys.push(field.getAlias());
				}
			});
			// STANDARD FIELDS
			_each(derivedTableSchema.fields, (name, field) => {
				if (!derivedTableSchemaAliased.fields[name]) {
					derivedTableSchemaAliased.fields[name] = field;
				}
			});
			return derivedTableSchemaAliased;
		}
		return Schema.tables[this.getName()] || {
			fields: {},
			uniqueKeys: [],
		};
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}) {
		var parse = Lexer.lex(expr, [' (as )?'], {useRegex:'i'});
		if (parse.tokens.length < 3) {
			var tableParse = parseCallback(parse.tokens[0]);
			if (tableParse instanceof ReferenceInterface) {
				if (params.withUac) {
					tableParse = parseCallback('(' + UACClient.select(null, tableParse.toString()) + ')', null, {withUac: false});
				} else {
					tableParse.isTableName = true;
				}
			} else if (!(tableParse instanceof AbstractionInterface && (tableParse.expr instanceof SelectInterface || tableParse.expr instanceof UnionInterface))) {
				throw new Error('Table expression must be either a plain reference or a (derived) query!');
			}
			return new this(
				tableParse, 
				(parse.tokens[1] || '').trim(), 
				(parse.matches[0] || '').trim()
			);
		}
	}
};