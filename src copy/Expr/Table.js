
/**
 * @imports
 */
import {
	AbstractionInterface,
	ReferenceInterface,
} from '../index.js';
import _isFunction from '@onephrase/util/js/isFunction.js';
import _isArray from '@onephrase/util/js/isArray.js';
import _isObject from '@onephrase/util/js/isObject.js';
import _isEmpty from '@onephrase/util/js/isEmpty.js';
import _promise from '@onephrase/util/js/promise.js';
import _arrFrom from '@onephrase/util/arr/from.js';
import _objFrom from '@onephrase/util/obj/from.js';
import _each from '@onephrase/util/obj/each.js';
import Lexer from '@onephrase/util/str/Lexer.js';
import SelectInterface from '../Stmt/SelectInterface.js';
import UnionInterface from '../Stmt/UnionInterface.js';
import UACClient from '../Uac/Client.js';
import TableInterface from './TableInterface.js';
import View from '../Base/View.js';
import _Factory from '../Base/_Factory.js';
import _Database from '../Base/_Database.js';

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
		return this.expr.context ? this.expr.context.name : null;
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
		return this.expr.name || '';
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
	 * Returns the asociated references
	 * 
	 * @return Array
	 */
	getArrowReferences() {
		return this.arrowReferences;
	}

	/**
	 * @inheritdoc
	 */
	getSchema() {
		if (!this._schema) {

			if (this.isDerivedQuery()) {
				var derivedName = this.getAlias();
				var derivedQuery = this.getDerivedQuery();
				var derivedQuerySources = derivedQuery.getSources(true/* resolve */);
				var getAliasOfField = fieldName => derivedQuery.getFields().reduce((alias, field) => alias || (fieldName === field.getName() ? field.getAlias() : null), null);
				// ---------------------
				// Sources schemas
				var MAIN_SCHEMA = derivedQuerySources.shift().getSchema(), REST_SCHEMAS = {};
				derivedQuerySources.forEach(source => {
					REST_SCHEMAS[source.getAlias()] = source.getSchema();
				});
				// ---------------------
				// Fields schemas
				var derivedSchema = { name: derivedName, fields: {}, uniqueKeys: {}, };
				derivedQuery.getFields().forEach(field => {
					if (field.expr instanceof ReferenceInterface) {
						var name = field.getName(), sourceName = field.getSourceName();
						derivedSchema.fields[field.getAlias()] = (sourceName && REST_SCHEMAS[sourceName] ? REST_SCHEMAS[sourceName] : MAIN_SCHEMA).fields[name];
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
				derivedSchema.engine = MAIN_SCHEMA.engine;

				// Cache
				this._schema = derivedSchema;
			} else {
				var tableName = this.getName();
				this._schema = (_Factory.schema[this.getDatabaseName() || _Factory.defaultDB] || {})[tableName] || {
					name: tableName, fields: {},
				};
			}
		}

		return this._schema;
	}
	
	/**
	 * @inheritdoc
	 */
	eval(context = null, params = {}) {

		if (!context) {
			throw new Error('Context must be provided!');
		}

		// Derived table???
		if (this.isDerivedQuery()) {

			var derivedName = this.getAlias(),
				derivedQuery = this.getDerivedQuery(),
				derivedSchema = this.getSchema();
			return derivedQuery.eval(context, params).then(derivedStore => {
				var _params = {...params};
				_params.alias = derivedName;
				return new View(derivedQuery, derivedStore, derivedName, derivedSchema, _params);
			});

		}

		if (this.expr instanceof ReferenceInterface) {

			return Promise.resolve().then(() => {
				var databaseName = this.getDatabaseName();
				if (context.prototype instanceof _Factory) {
					return databaseName ? context.open(databaseName) : context.open();
				}
				if (databaseName) {
					throw new Error('[' + this.expr + ']: For tables that are fully-qualified with a database name, a database factory must be provided as context.');
				}
				return context;
			}).then(database => {
				if (!(database instanceof _Database)) {
					throw new Error('[' + this.expr + ']: The provided context could not be resolved to a valid database instance.');
				}
				return database.open(this.getName(), params.mode, {alias: this.getAlias()});
			});

		}
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
		return [this.expr.stringify(params), this.claused ? 'AS' : '', this.alias].filter(a => a).join(' ');
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
					tableParse = parseCallback('(' + UACClient.select(null, tableParse.stringify()) + ')', null, {withUac: false});
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