
import StatementNode from '../StatementNode.js';

export default class DropDatabase extends StatementNode {
	 
	/**
	 * Instance properties
	 */
	NAME = '';

	/**
	 * @constructor
	 */
	constructor(context, name) {
		super(context);
		this.NAME = name;
	}
	
	/**
	 * @inheritdoc
	 */
	toJson() { return { name: this.NAME }; }
	
	/**
	 * @inheritdoc
	 */
	stringify() { return `DROP SCHEMA${ this.hasFlag('IF_EXISTS') ? ' IF EXISTS' : '' } ${ this.autoEsc(this.NAME) }${ this.hasFlag('CASCADE') ? ' CASCADE' : '' }`; }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		const [ match, ifExists, namePart ] = /^DROP\s+DATABASE\s+(IF\s+EXISTS\s+)?(.+)$/i.exec(expr) || [];
		if (!match) return;
		const [dbName] = this.parseIdent(context, namePart.trim()) || [];
		if (!dbName) return;
		const instance = new this(context, dbName);
		if (ifExists) instance.withFlag('IF_EXISTS');
		return instance;
	}

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json, flags = []) {
		if (!json.name || !json.name.match(/[a-zA-Z]+/i)) throw new Error(`Could not assertain database name or database name invalid.`);
		return (new this(context, json.name)).withFlag(...flags);;
	}

}