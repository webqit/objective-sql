
import Lexer from '@webqit/util/str/Lexer.js';
import { _unwrap } from '@webqit/util/str/index.js';
import StatementNode from '../StatementNode.js';
import TableLevelConstraint from './TableLevelConstraint.js';
import Column from './Column.js';
import Index from './Index.js';		

export default class CreateTable extends StatementNode {
	
	/**
	 * Instance properties
	 */
	NAME = '';
	BASENAME = '';
	COLUMNS = [];
	CONSTRAINTS = [];
	INDEXES = [];

	/**
	 * @constructor
	 */
	constructor(context, name, basename) {
		super(context);
		this.NAME = name;
		this.BASENAME = basename;
	}

	/**
	 * @property String
	 */
	get BASENAME() { return this.CONTEXT/*Database*/.name; }

	/**
	 * Adds a column to the schema,
	 * 
	 * @param Column column
	 * 
	 * @returns this
	 */
	column(...columns) { return this.build('COLUMNS', columns, Column); }

	/**
	 * Adds a table-level constraint to the schema,
	 * 
	 * @param TableLevelConstraint constraint
	 * 
	 * @returns this
	 */
	constraint(...constraints) { return this.build('CONSTRAINTS', constraints, TableLevelConstraint); }

	/**
	 * Adds an index index to the schema,
	 * 
	 * @param Index constraint
	 * 
	 * @returns this
	 */
	index(...indexes) { return this.build('INDEXES', indexes, Index); }

	/**
	 * @inheritdoc
	 */
	toJson() {
        const json = {
            name: this.NAME,
			basename: this.BASENAME,
            columns: this.COLUMNS.map(column => column.toJson()),
            constraints: this.CONSTRAINTS.map(constraint => constraint.toJson()),
            indexes: this.INDEXES.map(index => index.toJson())
        }
        return json;
    }
	
	/**
	 * @inheritdoc
	 */
	stringify() {
		const defs = [ this.COLUMNS.map(col => col.stringify()).join(',\n\t') ];
		const constraints = this.CONSTRAINTS.slice(0);
		if (this.params.dialect === 'mysql') {
			constraints.push(...this.COLUMNS.reduce((constraints, col) => {
				const constraint = col.CONSTRAINTS.find(c => c.ATTRIBUTE === 'REFERENCES');
				if (constraint) return constraints.concat(TableLevelConstraint.fromColumnLevelConstraint(constraint, col.NAME));
				return constraints;
			}, []));
		}
		if (constraints.length) { defs.push(constraints.map(cnst => cnst.stringify()).join(',\n\t')); }
		if (this.INDEXES.length) { defs.push(this.INDEXES.map(ndx => ndx.stringify()).join(',\n\t')); }
		return `CREATE TABLE${ this.hasFlag('IF_NOT_EXISTS') ? ' IF NOT EXISTS' : '' } ${ this.BASENAME ? `${ this.BASENAME }.` : `` }${ this.NAME } (\n\t${ defs.join(',\n\t') }\n)`;
	}
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		if (expr.trim().substr(0, 6).toUpperCase() !== 'CREATE') return;
		const [ create, body ] = Lexer.split(expr, [], { limit: 2 });
		const [ , ifNotExists, dbName, tblName ] = /CREATE[ ]+TABLE[ ]+(IF[ ]+NOT[ ]+EXISTS[ ]+)?(?:(\w+)\.)?(\w+)/i.exec(create) || [];
		if (!tblName) return;
		const instance = new this(context, tblName, dbName);
		if (ifNotExists) instance.withFlag('IF_NOT_EXISTS');
		const defs = await Promise.all(Lexer.split(_unwrap(body, '(', ')'), [',']).map(def => {
			return parseCallback(instance, def.trim(), [TableLevelConstraint,Index,Column]); // Note that Column must come last
		}));
		for (const def of defs) {
			if (def instanceof TableLevelConstraint) instance.constraint(def);
			else if (def instanceof Index) instance.index(def);
			else instance.column(def);
		}
		return instance;
	}

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json, flags = []) {
		if (!json.name || !json.name.match(/[a-zA-Z]+/i)) return;
		const instance = (new this(context, json.name, json.basename || context?.name)).withFlag(...flags);
		// Lists
		instance.column(...json.columns);
		instance.constraint(...(json.constraints || []));
		instance.index(...(json.indexes || []));
		// Instance
		return instance;
	}
	
	/**
	 * @inheritdoc
	 */
	static cloneJson(json) {
		const jsonClone = structuredClone(json);
		// ----------------
		const rebase = (obj, key) => {
			const value = obj[key];
			Object.defineProperty(obj, `$${ key }`, { get: () => value, configurable: true });
		};
		rebase(jsonClone, 'name');
		for (const column of jsonClone.columns || []) {
			for (const type of ['primaryKey', 'references', 'uniqueKey', 'check']) { column[type] && rebase(column[type], 'constraintName'); }
			rebase(column, 'name');
		}
		for (const constraint of jsonClone.constraints || []) { rebase(constraint, 'constraintName'); }
		for (const index of jsonClone.indexes || []) { rebase(index, 'indexName'); }
		// ----------------
		const redefine = (obj, key, nameKey) => {
			const arr = obj[key];
			Object.defineProperty(obj, key, { get() { return arr; } });
			Object.defineProperties(arr, {
				get: { value: name => arr.find(x => x[nameKey] === name), configurable: true },
				has: { value: name => arr.get(name) ? true : false, configurable: true },
				delete: { value: name => arr.splice(arr.findIndex(x => x[nameKey] === name), 1), configurable: true },
			});
		};
		redefine(jsonClone, 'columns', 'name');
		redefine(jsonClone, 'constraints', 'constraintName');
		redefine(jsonClone, 'indexes', 'indexName');
		// ----------------
		return jsonClone;
	}

}