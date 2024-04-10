
/**
 * @imports
 */
import DropInterface from './DropInterface.js';

/**
 * ---------------------------
 * DropTable class
 * ---------------------------
 */				

export default class DropTable extends DropInterface {
	 
	/**
	 * @inheritdoc
	 */
	constructor(name, database, params = {}) {
		super();
		this.name = name;
		this.database = database;
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
	stringify() { return `DROP TABLE${ this.params.ifExists ? ' IF EXISTS' : '' } ${ this.database ? `${ this.database }.` : `` }${ this.name }`; }
	
	/**
	 * @inheritdoc
	 */
	static async parse(expr, parseCallback, params = {}) {
		const [ , ifExists, dbName, tblName ] = /DROP[ ]+TABLE[ ]+(IF[ ]+EXISTS[ ]+)?(?:(\w+)\.)?(\w+)/i.exec(expr) || [];
		if (!tblName) return;
		if (ifExists) { params = { ...params, ifExists: true }; }
		return new this(tblName, dbName, params);
	}
}