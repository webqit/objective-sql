
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
import _promise from '@onephrase/util/js/promise.js';
import _arrFrom from '@onephrase/util/arr/from.js';
import _objFrom from '@onephrase/util/obj/from.js';
import _copy from '@onephrase/util/obj/copy.js';
import _each from '@onephrase/util/obj/each.js';
import Lexer from '@onephrase/util/str/Lexer.js';
import SelectInterface from '../Stmt/SelectInterface.js';
import UnionInterface from '../Stmt/UnionInterface.js';
import DerivedTableBase from '../Base/DerivedTable.js';
import TableBase from '../Base/Table.js';
import IDBTableBase from '../Base/IDBTable.js';
import Schema from '../Base/Schema.js';
import UACClient from '../Uac/Client.js';
import TableInterface from './TableInterface.js';

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
	getDatabaseName(params = {}) {
		return this.expr.context ? this.expr.context.name : params.defaultDB || 'default';
	}
	
	/**
	 * @inheritdoc
	 */
	getEngine(params = {}) {
		return params.engine || this.getSchema(params).engine;
	}
	
	/**
	 * @inheritdoc
	 */
	getSchema(params = {}) {

		if (this._schema) {
			return this._schema;
		}

		if (this.expr instanceof AbstractionInterface) {

			var derivedQuery = this.expr/*ABS*/.expr/*SELECT*/;
			var derivedTable = derivedQuery.getTable();
			var derivedTableSchema = (_isArray(derivedTable) ? derivedTable[0] : derivedTable).getSchema(params);
			this._schema = {
				fields: {},
				uniqueKeys: {},
			};

			var getAliasOfField = fieldName => derivedQuery.getFields().reduce((alias, field) => alias || (fieldName === field.getName() ? field.getAlias() : null), null) || fieldName;

			// FIELD NAME
			this._schema.name = this.getAlias();

			// PRIMARY KEY
			this._schema.primaryKey = _isArray(derivedTableSchema.primaryKey) 
				? derivedTableSchema.primaryKey.map(fieldName => getAliasOfField(fieldName))
				: getAliasOfField(derivedTableSchema.primaryKey);
			this._schema.autoIncrement = derivedTableSchema.autoIncrement;

			// RUNTIME FIELDS
			derivedQuery.getFields().forEach(field => {
				this._schema.fields[field.getAlias()] = derivedTableSchema.fields[field.getName()];
			});
			// The rest of the fields...
			_each(derivedTableSchema.fields, (name, field) => {
				if (!this._schema.fields[name]) {
					this._schema.fields[name] = field;
				}
			});

			// RUNTIME UNIQUE
			_each(derivedTableSchema.uniqueKeys || {}, (name, keyPath) => {
				var keyPathAliased = _arrFrom(keyPath).map(fieldName => getAliasOfField(fieldName));
				this._schema.uniqueKeys[name] = !_isArray(keyPath) ? keyPathAliased[0] : keyPathAliased;
			});

			// ENGINE
			this._schema.engine = derivedTableSchema.engine;

		} else {

			var databaseName = this.getDatabaseName(params), tableName = this.getName();
			this._schema = Schema.schemas[databaseName] && Schema.schemas[databaseName][tableName] ? Schema.schemas[databaseName][tableName] : {
				name: tableName,
				primaryKey: '',
				fields: {},
				uniqueKeys: {},
			};

		}

		return this._schema;
	}
	
	/**
	 * @inheritdoc
	 */
	eval(databases = null, params = {}) {
		// Derived table???
		if (this.expr instanceof AbstractionInterface) {
			var _params = _copy(params);
			_params.fieldsByReference = true;
			return new DerivedTableBase(this.expr/*ABS*/.expr/*SELECT*/.eval(databases, _params), null, this.alias, this.getSchema(params));
		}

		if (this.expr instanceof ReferenceInterface) {
			// We accept promises
			var databaseName = this.getDatabaseName(), engine = (this.getEngine(params) || '').toUpperCase();
			var DB = _promise(resolve => {
				resolve(databases);
			}).then(databases => {
				// ------------------
				// Obtain store
				// ------------------
				// We support IndexedDB natively
				if (engine === 'IDB') {
					var storeName = this.getName();
					if (!databases || isIndexedDB(databases)) {
						return getIDBDatabase(databases, databaseName);
					}
					if (isIDBDatabase(databases)) {
						if (this.expr.context) {
							throw new Error('The implied database object must be an IDBFactory in order to resolve the qualified IndexedDB store name "' + this.expr + '".');
						}
						return databases;
					}
					if (_isObject(databases)) {
						if (!isIDBDatabase(databases[databaseName])) {
							throw new Error('The implied database object must be an instance of IDBDatabase in order to resolve the IndexedDB store name "' + this.expr + '".');
						}
						return databases[databaseName];
					}
				}
				// ------------------
				if (!databases) {
					databases = Schema.databases;
				}
				if (!_isObject(databases[databaseName])) {
					throw new Error('The implied database must be an object in order to resolve the table name "' + this.expr + '".');
				}
				return databases[databaseName];
			});

			if (engine === 'IDB') {
				return new IDBTableBase(DB, this.getName(), this.getAlias(), this.getSchema(params));
			}

			return new TableBase(DB, this.getName(), this.getAlias(), this.getSchema(params));
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

/**
 * -----------------
 * @IndexedDB Helpers
 * -----------------
 */

const isIndexedDB = object => typeof indexedDB !== 'undefined' ? (object instanceof indexedDB) : _isFunction(object.open);
const isIDBDatabase = object => typeof IDBDatabase !== 'undefined' ? (object instanceof IDBDatabase) : _isFunction(object.transaction);
const getIDBDatabase = (_indexedDB, databaseName) => {
	return new Promise(resolve => {
		var dbOpenRequest = (_indexedDB || indexedDB).open(databaseName);
		dbOpenRequest.onsuccess = e => {
			resolve(e.target.result);
		};
	});
};