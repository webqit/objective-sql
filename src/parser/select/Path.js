
import Lexer from '../Lexer.js';
import Identifier from './Identifier.js';
import Node from '../abstracts/Node.js';

export default class Path extends Node {

	/**
	 * Static properties
	 */
	static ARR_RIGHT = '~>';
 	static ARR_LEFT = '<~';

	/**
	 * Instance propeties
	 */
	DIR = '';
	LHS = null;
	RHS = null;
	UUID = null;

	/**
	 * @property Bool
	 */
	get isOutgoing() { return this.DIR === this.constructor.ARR_RIGHT; }

	/**
	 * @property Bool
	 */
	get isIncoming() { return this.DIR === this.constructor.ARR_LEFT; }

	/**
	 * @property String
	 */
	get uuid() {
		if (!this.UUID) { this.UUID = `$path:${ ( 0 | Math.random() * 9e6 ).toString( 36 ) }`; }
		return this.UUID;
	}

	/**
	 * Builds the operands.
	 * 
	 * @param Identifier lhs 
	 * @param String dir
	 * @param Identifier,Path rhs 
	 * 
	 * @returns Void
	 */
	path(lhs, dir, rhs) {
		const $static = this.constructor;
		if (![$static.ARR_LEFT, $static.ARR_RIGHT].includes(dir)) throw new Error(`Unknown operator: "${ dir }".`);
		this.build('LHS', [lhs], Identifier);
		this.build('RHS', [rhs], [Identifier,$static]);
		this.DIR = dir;
	}

	/**
	 * Evaluates the relationship 
	 * and returns the parameters for plotting the join.
	 * 
	 * @returns Object
	 */
	async resolve() {
		const getPrimaryKey = schema => schema.columns.find(col => col.primaryKey)?.name || schema.constraints.find(cons => cons.type === 'PRIMARY_KEY')?.columns[0];
		const getKeyDef = (schema, foreignKey) => schema.columns.find(col => col.name === foreignKey.NAME)?.references || schema.constraints.find(cons => cons.type === 'FOREIGN_KEY' && cons.columns.includes(foreignKey.NAME))?.references;
		const getSchema = async (tblName, dbName) => {
			const clientApi = this.rootNode.CONTEXT;
			const basename = dbName || await clientApi.getBasename(tblName);
			const dbApi = clientApi.database(basename);
			return await dbApi.describeTable(tblName);
		};
		if (this.isIncoming) {
			if (!(this.RHS instanceof Path)) throw new Error(`Unterminated path: ${ this.RHS }`);
			// --------------------------
			// === {foreignKey}LHS<-RHS{table...}
			let foreignKey_rhs, table_rhs, schema_rhs, path;
			if (this.RHS.isIncoming) {
				if (!(this.RHS.RHS instanceof Path)) throw new Error(`Unterminated path: ${ this.RHS.RHS }`);
				// === {foreignKey}LHS<-RHS{foreignKey_rhs<-table->?...}
				({ LHS: foreignKey_rhs/*Identifier*/, RHS/*Path*/: path } = this);
				schema_rhs = (await path.resolve()).lhs.schema;
				table_rhs = Identifier.fromJson(this, schema_rhs);
			} else {
				// === {foreignKey}LHS<-RHS{table->path}
				({ LHS: foreignKey_rhs/*Identifier*/, RHS/*Path*/: { LHS: table_rhs/*Identifier*/, RHS: path/*Identifier|Path*/ } } = this);
				schema_rhs = await getSchema(table_rhs.NAME, table_rhs.BASENAME);
				if (!schema_rhs) throw new Error(`[${ this }]: The implied table ${ table_rhs } does not exist.`);
			}
			const keyDef_rhs = getKeyDef(schema_rhs, foreignKey_rhs);
			// Validate that schema_rhs has the implied foreign key (actingKey)
			if (!keyDef_rhs) throw new Error(`[${ this }]: Table ${ table_rhs } does not define the implied foreign key ${ foreignKey_rhs }.`);
			// -------------
			// Get schema_lhs from keyDef
			const table_lhs = Identifier.fromJson(this, keyDef_rhs);
			const schema_lhs = await getSchema(table_lhs.NAME, table_lhs.BASENAME);
			if (!schema_lhs) throw new Error(`[${ this }]: The implied table ${ table_lhs } does not exist.`);
			// Get shcema_lhs's acting key (primary key) and validate
			const primaryKey_lhs = getPrimaryKey(schema_lhs);
			if (!primaryKey_lhs) throw new Error(`[${ this }]: Table ${ schema_lhs.name } does not define a primary key.`);
			// -------------
			// Put together
			return {
				lhs: { schema: schema_lhs, primaryKey: primaryKey_lhs, },
				rhs: { schema: schema_rhs, foreignKey: foreignKey_rhs, path, },
			};
		}
		// -------------
		// reference === {foreignKey}LHS->RHS{path}
		const table_lhs = this.statementNode.FROM_LIST[0]/*Table*/.EXPR/*Identifier*/;
		if (!(table_lhs instanceof Identifier)) throw new Error(`[${ this }]: Base query must not be derived.`);
		// Get lhs schema
		const schema_lhs = await getSchema(table_lhs.NAME, table_lhs.BASENAME);
		const { LHS: foreignKey_lhs/*Identifier*/, RHS: path/*Identifier|Path*/ } = this;
		// We get schema2 from schema_lhs
		const keyDef_lhs = getKeyDef(schema_lhs, foreignKey_lhs);
		// Validate that schema_lhs has the implied foreign key (foreignKey)
		if (!keyDef_lhs) throw new Error(`[${ this }]: Table ${ table_lhs } does not define the implied foreign key ${ foreignKey_lhs }.`);
		// -------------
		// Get schema_rhs from keyDef!
		const table_rhs = Identifier.fromJson(this, keyDef_lhs);
		const schema_rhs = await getSchema(table_rhs.NAME, table_rhs.BASENAME || table_lhs.BASENAME);
		if (!schema_rhs) throw new Error(`[${ this }]: The implied table ${ table_rhs } does not exist.`);
		// Get shcema_lhs's acting key (primary key) and validate
		const primaryKey_rhs = getPrimaryKey(schema_rhs);
		if (!primaryKey_rhs) throw new Error(`[${ this }]: Table ${ table_rhs } does not define a primary key.`);
		// -------------
		// Put together
		return {
			lhs: { schema: schema_lhs, foreignKey: foreignKey_lhs, },
			rhs: { schema: schema_rhs, primaryKey: primaryKey_rhs, path, },
		};
	}

	/**
	 * Plots the relationship.
	 * 
	 * @returns Void
	 */
	async plot() {
		// Resolve relation and validate
		const { lhs, rhs } = await this.resolve();
		const baseTable = this.statementNode.FROM_LIST[0]/*Table*/;
		if (!(baseTable.EXPR instanceof Identifier)) throw new Error(`[${ this }]: Base query must not be derived.`);
		if (lhs.primaryKey/*then incoming reference*/ && lhs.schema.table !== baseTable.EXPR.NAME) throw new Error(`[${ this }]: Cannot resolve incoming path to base table ${ baseTable.EXPR }.`);
		// Do plotting
		const joinAlias = `$view:${ [lhs.foreignKey || lhs.primaryKey, rhs.schema.table, rhs.schema.basename, rhs.primaryKey || rhs.foreignKey].join(':') }`;
		const joint = () => this.JOINT = this.statementNode.JOINS.find(joint => joint.ALIAS.NAME === joinAlias);
		if (!joint()) {
			// Implement the join for the first time
			const baseAlias = ['ALIAS','EXPR'].reduce((prev, key) => prev || this.statementNode.FROM_LIST[0]/*Table*/[key]?.NAME, null);
			this.statementNode.leftJoin(
				join => join.expr( expr => expr.from({ name: rhs.schema.table, basename: rhs.schema.basename }) )
					.with({ IS_SMART_JOIN: true }).as({ name: joinAlias }).on( on => on.equal({ name: rhs.schema.primaryKey || rhs.schema.foreignKey, basename: joinAlias }, { name: lhs.schema.foreignKey || lhs.schema.primaryKey, basename: baseAlias }) )
			);
			joint();
		}
		// For something like: author~>name, select "$view:fk_name:tbl_name:db_name:pk_name"."name" as "$path:unxnj"
		// Now on outer query, that would resolve to selecting "$view:fk_name:tbl_name:db_name:pk_name"."$path:unxnj" as "author"->"name"
		// For something like: author~>country->name, select "$view:fk_name:tbl_name:db_name:pk_name"."country"->"name" as "$path:unxnj"
		// Now on outer query, that would resolve to selecting "$view:fk_name:tbl_name:db_name:pk_name"."$path:unxnj" as "author"~>"country"->"name"
		this.JOINT.EXPR/*Query*/.select( field => field.expr(rhs.path).as({ name: this.uuid }) );
	}

	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		const { tokens, matches } = Lexer.lex(expr, [this.ARR_LEFT, this.ARR_RIGHT], { preserveDelims: true, limit: 1 }) || {};
		if (tokens.length !== 2) return;
		const instance = new this(context);
		instance.path(
			await parseCallback(instance, tokens[0], [Identifier]),
			matches[0],
			await parseCallback(instance, tokens[0], [Identifier,this]),
		);
		return instance;
	}
}