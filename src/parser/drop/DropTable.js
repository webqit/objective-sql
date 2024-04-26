
import StatementNode from '../StatementNode.js';

export default class DropTable extends StatementNode {
	
	/**
	 * Instance properties
	 */
	NAME = '';
	BASENAME = '';

	/**
	 * @constructor
	 */
	constructor(context, name, basename) {
		super(context);
		this.NAME = name;
		this.BASENAME = basename;
	}
	
	/**
	 * @inheritdoc
	 */
	toJson() { return { name: this.NAME, basename: this.BASENAME }; }
	
	/**
	 * @inheritdoc
	 */
	stringify() { return `DROP TABLE${ this.hasFlag('IF_EXISTS') ? ' IF EXISTS' : '' } ${ this.autoEsc([this.BASENAME, this.NAME].filter(s => s)).join('.') }`; }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		const [ , ifExists, dbName, tblName ] = /DROP\s+TABLE\s+(IF\s+EXISTS\s+)?(?:(\w+)\.)?(\w+)/i.exec(expr) || [];
		if (!tblName) return;
		const instance = new this(context, tblName, dbName);
		if (ifExists) instance.withFlag('IF_EXISTS');
		return instance;
	}

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json, flags = []) {
		if (!json.name || !json.name.match(/[a-zA-Z]+/i)) return;
		return (new this(context, json.name, json.basename)).withFlag(...flags);
	}

}