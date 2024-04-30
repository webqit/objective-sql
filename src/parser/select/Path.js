
import Lexer from '../Lexer.js';
import Identifier from '../Identifier.js';
import Node from '../Node.js';
		
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

	// ------------------------

	/**
	 * Gets the immediate target in a reference path.
	 * 
	 * @param {Object} schema1
	 * @param {Object} dbClient
	 * 
	 * @return {Object}
	 */
	async process(schema1, dbClient = null) {
		const reference = this.interpreted ? this.interpreted.toString() : this.toString();
		return await this.constructor.process(schema1, reference.replace(/`/g, ''), dbClient);
	}

	/**
	 * Tells if a column is a reference.
	 *
	 * @param String str
	 *
	 * @return Bool
	 */
	static isReference(str) { return !!Lexer.match(str, [this.ARR_LEFT, this.ARR_RIGHT]).length; }
	
	/**
	 * Tells if a path is an outgoing reference in direction.
	 *
	 * @param String reference
	 *
	 * @return bool
	 */
	static isOutgoing(reference) { return Lexer.match(reference, [this.ARR_RIGHT, this.ARR_LEFT])[0] === this.ARR_RIGHT; }
	
	/**
	 * Tells if a path is an incoming reference in direction.
	 *
	 * @param {String} reference
	 *
	 * @return bool
	 */
	static isIncoming(reference) { return Lexer.match(reference, [this.ARR_LEFT, this.ARR_RIGHT])[0] === this.ARR_LEFT; }
	
	/**
	 * Returns the relationshipPath in reverse direction.
	 *
	 * @param {String} reference
	 *
	 * @return string
	 */
	static reverse(reference) {
		const { tokens, matches } = Lexer.lex(reference, [this.ARR_LEFT, this.ARR_RIGHT]);
		return tokens.reduce((tokens, t, i) => tokens.concat(t, matches[i] === this.ARR_RIGHT ? this.ARR_LEFT : this.ARR_RIGHT), []).reverse().join('');
	}

	/**
	 * Gets the immediate target in a reference path.
	 * 
	 * @param Object dbClient 
	 * @param Object schema1 
	 * @param String reference 
	 * 
	 * @return Object
	 */
    static async process(database, schema1, reference) {
		const getPrimaryKey = schema => schema.columns.find(col => col.primaryKey)?.name || schema.constraints.find(cons => cons.type === 'PRIMARY_KEY')?.columns[0];
		const getReferenceDef = (schema, actingKey) => schema.columns.find(col => col.name === actingKey)?.references || schema.constraints.find(cons => cons.type === 'FOREIGN_KEY' && cons.columns.includes(actingKey))?.references;
		const getSchema = async (tblName, dbName) => {
			let $database = database;
			if (dbName && $database.name !== dbName) { $database = database.client.database(dbName); }
			return await $database.describeTable(tblName);
		};
		if (this.isIncoming(reference)) {
			// --------------------------
			// reference === actingKey<-table
			let actingKey, sourceTable, basename, select, schema2;
			[ actingKey, sourceTable ] = Lexer.split(reference, [this.ARR_LEFT], { limit: 1 });
			if (this.isIncoming(sourceTable)) {
				// reference === actingKey<-actingKey2<-table->?...
				schema2 = (await this.process(database, null, sourceTable/* as new reference */))[0].schema;
				select = sourceTable;
			} else {
				// reference === actingKey<-table->?...
				[sourceTable, select] = Lexer.split(sourceTable, [this.ARR_RIGHT]);
				[sourceTable, basename] = this.parseIdent(database, sourceTable);
				schema2 = await getSchema(sourceTable, basename);
				if (!schema2) throw new Error(`[${ reference }]: The implied table "${ sourceTable }" does not exist.`);
			}
			const referenceDef = getReferenceDef(schema2, actingKey);
			// Validate that schema2 has the implied foreign key (actingKey)
			if (!referenceDef) throw new Error(`[${ reference }]: The "${ schema2.name }" table does not define the implied foreign key "${ actingKey }".`);
			// Validate that schema2's actingKey is a reference to schema1
			if (schema1 && referenceDef.table !== schema1.name) throw new Error(`[${ reference }]: "${ schema2.name }"."${ actingKey }" table does not reference "${ schema1.name }".`);
			// Get schema1 from schema2?
			if (!schema1) { schema1 = await getSchema(referenceDef.table, referenceDef.basename); }
			// Get shcema1's acting key (primary key) and validate
			const schema1ActingKey = getPrimaryKey(schema1);
			if (!schema1ActingKey) throw new Error(`[${ reference }]: "${ schema1.name }" does not define a primary key.`);
			// Put together
			return [
				{ schema: schema1, actingKey: schema1ActingKey, },
				{ schema: schema2, actingKey, select, },
			];
		}
		// --------------------------
		// reference === foreignKey->...
		const [foreignKey, select] = Lexer.split(reference, [this.ARR_RIGHT]);
		// We get schema2 from schema1
		const referenceDef = getReferenceDef(schema1, foreignKey);
		// Validate that schema1 has the implied foreign key (foreignKey)
		if (!referenceDef) throw new Error(`[${ reference }]: The "${ schema1.name }" table does not define the implied foreign key "${ foreignKey }".`);
		const schema2 = await database.describeTable(referenceDef.table);
		// Get shcema1's acting key (primary key) and validate
		const schema2ActingKey = getPrimaryKey(schema2);
		if (!schema2ActingKey) throw new Error(`[${ reference }]: "${ schema2.name }" does not define a primary key.`);
		// Put together
		return [
			{ schema: schema1, actingKey: foreignKey, },
			{ schema: schema2, actingKey: schema2ActingKey, select, },
		];
	}
}