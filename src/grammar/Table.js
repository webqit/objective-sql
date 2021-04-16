
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
import _Factory, { factoryGetSchema } from '../database/_Factory.js';
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
			var derivedSchema = { name: derivedName, fields: {}, uniqueKeys: {}, derived: true, };
			derivedQuery.getFields().forEach(field => {
				if (field.expr instanceof ReferenceInterface) {
					if (field.getName() === '*') {
						field.expr.interpreted.forEach(ref => {
							derivedSchema.fields[ref.name] = ((ALL_SCHEMAS[ref.context.name] || {}).fields || {})[name] || {type: 'any', derived: true};
						});
					} else {
						var name = field.getName(), context = field.getContextName();
						derivedSchema.fields[field.getAlias()] = (((context ? ALL_SCHEMAS[context] : MAIN_SCHEMA) || {}).fields || {})[name] || {type: 'any', derived: true};
					}
				} else {
					derivedSchema.fields[field.getAlias()] = {type: 'any', derived: true};
				}
			});
			// ---------------------
			// PRIMARY KEY
			derivedSchema.primaryKey = _isArray(MAIN_SCHEMA.primaryKey) 
				? MAIN_SCHEMA.primaryKey.map(fieldName => getAliasOfField(fieldName))
				: getAliasOfField(MAIN_SCHEMA.primaryKey);
			derivedSchema.autoIncrement = MAIN_SCHEMA.autoIncrement;
			if (_isEmpty(derivedSchema.primaryKey)) {
				delete derivedSchema.primaryKey;
				delete derivedSchema.autoIncrement;
			}
			// ---------------------
			// RUNTIME UNIQUE
			_each(MAIN_SCHEMA.uniqueKeys || {}, (name, keyPath) => {
				var keyPathAliased = _arrFrom(keyPath).map(fieldName => getAliasOfField(fieldName));
				derivedSchema.uniqueKeys[name] = !_isArray(keyPath) ? keyPathAliased[0] : keyPathAliased;
				if (_isEmpty(derivedSchema.uniqueKeys[name])) {
					delete derivedSchema.uniqueKeys[name];
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
	eval(DB_FACTORY = null, params = {}) {

		if (this.interpreted) {
			return this.interpreted.eval(DB_FACTORY, params);
		}

		// --------------------------

		if (!DB_FACTORY) {
			throw new Error('Context must be provided!');
		}

		// --------------------------

		// Derived table???
		if (this.isDerivedQuery()) {

			var derivedName = this.getAlias(),
				derivedQuery = this.getDerivedQuery(),
				derivedSchema = this.getSchema(DB_FACTORY);
			return derivedQuery.eval(DB_FACTORY, params).then(derivedStore => {
				var _params = {...params};
				_params.alias = derivedName;
				return new View(derivedQuery, derivedStore, derivedName, derivedSchema, _params);
			});

		}

		return Promise.resolve().then(() => {
			var databaseName = this.getDatabaseName();
			if (DB_FACTORY.prototype instanceof _Factory) {
				return databaseName ? DB_FACTORY.open(databaseName) : DB_FACTORY.open();
			}
			if (databaseName) {
				throw new Error('[' + this.expr + ']: For tables that are fully-qualified with a database name, a database factory must be provided as context.');
			}
			return DB_FACTORY;
		}).then(database => {
			if (!(database instanceof _Database)) {
				throw new Error('[' + this.expr + ']: The provided context could not be resolved to a valid database instance.');
			}
			return database.open(this.getName(), params.mode, {alias: this.getAlias()});
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
				var DB_SCHEMA = {},
					fullTableName = tableParse.toString().split('.'),
					tableName = fullTableName.pop(),
					databaseName = fullTableName.pop();
					DB_SCHEMA = factoryGetSchema(params.DB_FACTORY, databaseName);
				// -----------
				if (DB_SCHEMA && DB_SCHEMA[tableName]) {
					SCHEMA = DB_SCHEMA[tableName];
				} else {
					if (params.validation !== false && params.assertTableValidity !== false) {
						// Throw "Table unknown!"
						throw new Error('Unknown table: ' + tableName + '.');
					}
					SCHEMA = { name: tableName, fields: {}, derived: true, };
				}
			} else {
				if (!alias) {
					throw new Error('Derived tables must be aliased.');
				}
			}

			return new this(tableParse, alias, claused, SCHEMA);
		}
	}
}