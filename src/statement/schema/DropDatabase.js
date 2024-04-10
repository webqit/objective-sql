
/**
 * @imports
 */
import DropInterface from './DropInterface.js';

/**
 * ---------------------------
 * DropDatabase class
 * ---------------------------
 */				

export default class DropDatabase extends DropInterface {
	 
	/**
	 * @inheritdoc
	 */
	constructor(name, params = {}) {
		super();
		this.name = name;
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
	stringify() { return `DROP ${ this.params.dialect === 'postgres' ? 'SCHEMA' : 'DATABASE' }${ this.params.ifExists ? ' IF EXISTS' : '' } ${ this.name }`; }
	
	/**
	 * @inheritdoc
	 */
	static async parse(expr, parseCallback, params = {}) {
		const [ , ifExists, dbName ] = /DROP[ ]+DATABASE[ ]+(IF[ ]+EXISTS[ ]+)?(\w+)/i.exec(expr) || [];
		if (!dbName) return;
		if (ifExists) { params = { ...params, ifExists: true }; }
		return new this(dbName, params);
	}

}