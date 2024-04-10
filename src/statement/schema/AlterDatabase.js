
/**
 * @imports
 */
import AlterInterface from './AlterInterface.js';

/**
 * ---------------------------
 * AlterDatabase class
 * ---------------------------
 */				

export default class AlterDatabase extends AlterInterface {
	 
	/**
	 * @inheritdoc
	 */
	constructor(name, diffs, params = {}) {
		super();
		this.name = name;
		this.diffs = diffs;
		this.nodeTypes = (diffs.rename ? [ 'name' ] : []);
		this.params = params;
	}
	
	/**
	 * @inheritdoc
	 */
	async eval() {}
	
	/**
	 * @inheritdoc
	 */
	toString() { return this.stringify(); }
	
	/**
	 * @inheritdoc
	 */
	stringify() { return `ALTER ${ this.params.dialect === 'postgres' ? 'SCHEMA' : 'DATABASE' }${ this.params.ifExists ? ' IF EXISTS' : '' } ${ this.name } RENAME TO ${ this.diffs.rename }`; }
	
	/**
	 * @inheritdoc
	 */
	static fromDiffing(jsonA, jsonB, params = {}) {
		if (!jsonA.name || !jsonA.name.match(/[a-zA-Z]+/i)) throw new Error(`Could not assertain database1 name or database1 name invalid.`);
		if (!jsonB.name || !jsonB.name.match(/[a-zA-Z]+/i)) throw new Error(`Could not assertain database2 name or database2 name invalid.`);
		const diffs = {};
		if (jsonB.name !== jsonA.name) {
			diffs.rename = jsonB.name;
		}
		return new this(jsonA.name, diffs, params);
	}

	/**
	 * @inheritdoc
	 */
	static async parse(expr, parseCallback, params = {}) {
		const [ , ifExists, dbName, newName ] = /ALTER[ ]+DATABASE[ ]+(IF[ ]+EXISTS[ ]+)?(\w+)[ ]+RENAME[ ]+TO[ ]+(\w+)/i.exec(expr) || [];
		if (!dbName) return;
		const diffs = { rename: newName };
		if (ifExists) { params = { ...params, ifExists: true }; };
		return new this(dbName, diffs, params);
	}

}