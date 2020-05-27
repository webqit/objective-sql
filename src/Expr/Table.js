
/**
 * @imports
 */
import {
	AbstractionInterface,
	ReferenceInterface,
	Lexer
} from '../index.js';
import Schema from '../Schema.js';
import _isArray from '@web-native-js/commons/js/isArray.js';
import _objFrom from '@web-native-js/commons/obj/from.js';
import SelectInterface from './SelectInterface.js';
import TableInterface from './TableInterface.js';
import UnionInterface from './UnionInterface.js';
import DerivedTableBase from '../Base/DerivedTable.js';
import TableBase from '../Base/Table.js';

/**
 * ---------------------------
 * Table class
 * ---------------------------
 */				

const Table = class extends TableInterface {
	
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
	eval(database = null, trap = {}) {
		// Derived table???
		if (this.expr instanceof AbstractionInterface) {
			return new DerivedTableBase(database, this.expr/*ABS*/.expr/*SELECT*/, this.alias, this.getSchema());
		}
		if (this.expr instanceof ReferenceInterface) {
			// We must eval() without context...
			if (this.expr.context) {
				var tableData = this.expr.eval(_objFrom(this.expr.context.name, database), trap);
			} else {
				var tableData = this.expr.eval(database, trap);
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
			derivedQuery.getFields().forEach(field => {
				derivedTableSchemaAliased.fields[field.getAlias()] = derivedTableSchema.fields[field.getName()];
				if (derivedTableSchema.uniqueKeys.includes(field.getName())) {
					derivedTableSchemaAliased.uniqueKeys.push(field.getAlias());
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
	static parse(expr, parseCallback, Static = Table) {
		var parse = Lexer.lex(expr, [' (as )?'], {useRegex:'i'});
		if (parse.tokens.length < 3) {
			var tableParse = parseCallback(parse.tokens[0]);
			if (tableParse instanceof ReferenceInterface) {
				tableParse.isTableName = true;
			} else if (!(tableParse instanceof AbstractionInterface && (tableParse.expr instanceof SelectInterface || tableParse.expr instanceof UnionInterface))) {
				throw new Error('Table expression must be either a plain reference or a (derived) query!');
			}
			return new Static(
				tableParse, 
				(parse.tokens[1] || '').trim(), 
				(parse.matches[0] || '').trim()
			);
		}
	}
};

/**
 * @exports
 */
export default Table;
