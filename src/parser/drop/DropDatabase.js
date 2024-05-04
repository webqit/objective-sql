
import StatementNode from '../abstracts/StatementNode.js';

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
	 * Sets the name
	 * 
	 * @param String name
	 * 
	 * @returns this
	 */
	name(name) { this.NAME = name; return this; }
	
	/**
	 * @inheritdoc
	 */
	toJson() { return { name: this.NAME, flags: this.FLAGS }; }

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json) {
		if (typeof json?.name !== 'string') return;
		return (new this(context, json.name)).withFlag(...(json.flags || []));;
	}
	
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

}