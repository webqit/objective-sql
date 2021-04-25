
/**
 * @imports
 */
import {
	Abstraction,
	AbstractionInterface,
	ReferenceInterface,
} from '../grammar.js';
import _isFunction from '@webqit/util/js/isFunction.js';
import _isArray from '@webqit/util/js/isArray.js';
import _isObject from '@webqit/util/js/isObject.js';
import _isEmpty from '@webqit/util/js/isEmpty.js';
import _promise from '@webqit/util/js/promise.js';
import _arrFrom from '@webqit/util/arr/from.js';
import _objFrom from '@webqit/util/obj/from.js';
import _objFirst from '@webqit/util/obj/first.js';
import _each from '@webqit/util/obj/each.js';
import Lexer from '@webqit/util/str/Lexer.js';
import LiteralInterface from '../grammar/LiteralInterface.js';
import Literal from '../grammar/Literal.js';
import TableInterface from './TableInterface.js';
import View from '../database/View.js';
import _Driver from '../database/_Driver.js';
import _Database from '../database/_Database.js';

/**
 * ---------------------------
 * Table class
 * ---------------------------
 */				

export default class Table extends TableInterface {
	
	/**
	 * @inheritdoc
	 */
	constructor(expr, alias, claused = false, schema = null) {
		super();
		// LiteralInterface or AbstractionInterface
		this.expr = expr;
		this.alias = alias;
		this.claused = claused;
		this.schema = schema;
		this.associatedReferences = [];
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
	getDatabaseName() {
		return (this.expr + "").split('.').slice(0, -1)[0] || '';
	}
	
	/**
	 * @inheritdoc
	 */
	getName() {
		// Ask down the line?
		if (this.isDerivedQuery()) {
			return _arrFrom(this.getDerivedQuery().getTable(), false)[0].getName();
		}
		// Without backticks
		return (this.expr + "").split('.').pop();
	}

	/**
	 * @inheritdoc
	 */
	getAlias() {
		return this.alias || this.getName();
	}

	/**
	 * Tells if this is a derived query
	 * 
	 * @return Bool
	 */
	isDerivedQuery() {
		return this.expr instanceof AbstractionInterface;
	}

	/**
	 * Returns the derived query
	 * 
	 * @return Bool
	 */
	getDerivedQuery() {
		return this.expr/*ABS*/.expr/*SELECT*/;
	}

	/**
	 * Associates a Reference
	 * 
	 * @param Object reference
	 * 
	 * @return void
	 */
	associateReference(reference) {
		return this.associatedReferences.push(reference);
	}

	/**
	 * Returns the associated References
	 * 
	 * @return Array
	 */
	getAssociateReferences() {
		return this.associatedReferences;
	}

	/**
	 * @inheritdoc
	 */
	getSchema() {
		if (!this.schema && this.isDerivedQuery()) {
			var derivedName = this.getAlias();
			var derivedQuery = this.getDerivedQuery();
			var derivedQuerySources = derivedQuery.getSources(true/* resolve */);
			var getAliasOfField = fieldName => derivedQuery.getFields().reduce((alias, field) => alias || (fieldName === field.getName() ? field.getAlias() : null), null);
			// ---------------------
			// Sources schemas
			var ALL_SCHEMAS = {};
			derivedQuerySources.forEach(source => {
				ALL_SCHEMAS[source.getAlias()] = source.getSchema();
			});
			var MAIN_SCHEMA = _objFirst(ALL_SCHEMAS);
			// ---------------------
			// Fields schemas
			var derivedSchema = { name: derivedName, columns: {}, indexes: {}, derived: true, };
			derivedQuery.getFields().forEach(field => {
				if (field.expr instanceof ReferenceInterface) {
					if (field.getName() === '*') {
						field.expr.interpreted.forEach(ref => {
							derivedSchema.columns[ref.name] = ((ALL_SCHEMAS[ref.context.name] || {}).columns || {})[name] || {type: 'any', derived: true};
						});
					} else {
						var name = field.getName(), context = field.getContextName();
						derivedSchema.columns[field.getAlias()] = (((context ? ALL_SCHEMAS[context] : MAIN_SCHEMA) || {}).columns || {})[name] || {type: 'any', derived: true};
					}
				} else {
					derivedSchema.columns[field.getAlias()] = {type: 'any', derived: true};
				}
			});
			// ---------------------
			// PRIMARY KEY
			if (!_isEmpty(derivedSchema.primaryKey)) {
				derivedSchema.primaryKey = _isArray(MAIN_SCHEMA.primaryKey) 
					? MAIN_SCHEMA.primaryKey.map(fieldName => getAliasOfField(fieldName))
					: getAliasOfField(MAIN_SCHEMA.primaryKey);
			}
			// ---------------------
			// RUNTIME UNIQUE
			_each(MAIN_SCHEMA.indexes || {}, (indexName, indexDef) => {
				indexDef = {...indexDef};
				var keyPathAliased = _arrFrom(indexDef.keyPath).map(fieldName => getAliasOfField(fieldName));
				indexDef.keyPath = !_isArray(indexDef.keyPath) ? keyPathAliased[0] : keyPathAliased;
				if (!_isEmpty(indexDef.keyPath)) {
					derivedSchema.indexes[indexName] = indexDef;
				}
			});
			// ---------------------
			// ENGINE
			derivedSchema.driver = MAIN_SCHEMA.driver;

			// Cache
			this.schema = derivedSchema;
		}

		return this.schema;
	}
	
	/**
	 * @inheritdoc
	 */
	eval(dbDriver = null, params = {}) {

		if (this.interpreted) {
			return this.interpreted.eval(dbDriver, params);
		}

		// --------------------------

		if (!dbDriver) {
			throw new Error('Context must be provided!');
		}

		const getDatabase = databaseName => {
			return Promise.resolve().then(() => {
				if (dbDriver instanceof _Driver) {
					return databaseName ? dbDriver.database(databaseName) : dbDriver.database();
				}
				if (databaseName) {
					throw new Error('[' + this.expr + ']: For tables that are fully-qualified with a database name, a database factory must be provided as context.');
				}
				return dbDriver;
			})
		};
		// --------------------------

		// Derived table???
		if (this.isDerivedQuery()) {
			var derivedName = this.getAlias(),
				derivedQuery = this.getDerivedQuery(),
				derivedSchema = this.getSchema(dbDriver);
			return derivedQuery.eval(dbDriver, params).then(async derivedStore => {
				var database = await getDatabase();
				var _params = {...params};
				_params.alias = derivedName;
				return new View(derivedQuery, database, derivedName, {
					schema: derivedSchema, 
					data: derivedStore,
				}, _params);
			});
		}

		var databaseName = this.getDatabaseName();
		return getDatabase(databaseName).then(database => {
			if (!(database instanceof _Database)) {
				throw new Error('[' + this.expr + ']: The provided context could not be resolved to a valid database instance.');
			}
			return database.table(this.getName(), {mode: params.mode, alias: this.getAlias()});
		});

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
		// --------------------------
		if (this.interpreted && params.interpreted) {
			return this.interpreted.stringify(params);
		}
		// --------------------------
		return [this.expr.stringify(params), this.claused ? 'AS' : '', this.alias].filter(a => a).join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}) {
		var parse = Lexer.lex(expr, [' (as )?'], {useRegex:'i'});
		if (parse.tokens.length < 3) {
			var SCHEMA;
			var tableParse = parseCallback(parse.tokens[0], [Abstraction, Literal]);
			var alias = (parse.tokens[1] || '').trim(), 
				claused = (parse.matches[0] || '').trim();

			// -------------------
			// OBTAIN OR CREATE TABLE SCHEMA
			// -------------------

			if (tableParse instanceof LiteralInterface) {
				var fullTableName = tableParse.toString().split('.'),
					tableName = fullTableName.pop(),
					databaseName = fullTableName.pop(),
					DB_SCHEMA = params.dbDriver.getDatabaseSchema(databaseName);
				// -----------
				if (DB_SCHEMA && DB_SCHEMA[tableName]) {
					SCHEMA = DB_SCHEMA[tableName];
				} else {
					if (params.validation !== false && params.assertTableValidity !== false) {
						// Throw "Table unknown!"
						throw new Error('Unknown table: ' + tableName + '.');
					}
					SCHEMA = { name: tableName, columns: {}, indexes: {}, derived: true, };
				}
			} else {
				if (!alias) {
					throw new Error(`Derived tables must be aliased.`);
				}
			}

			return new this(tableParse, alias, claused, SCHEMA);
		}
	}
}