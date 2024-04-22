
import StatementNode from '../StatementNode.js';

export default class CreateDatabase extends StatementNode {
	 
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
	stringify() { return `CREATE SCHEMA${ this.hasFlag('IF_NOT_EXISTS') ? ' IF NOT EXISTS' : '' } ${ this.NAME }`; }

	/**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		const [ , ifNotExists, dbName ] = /CREATE[ ]+DATABASE[ ]+(IF[ ]+NOT[ ]+EXISTS[ ]+)?(\w+)/i.exec(expr) || [];
		if (!dbName) return;
		const instance = new this(context, dbName, params);
		if (ifNotExists) instance.withFlag('IF_NOT_EXISTS');
		return instance;
	}

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json, flags = []) {
		if (!json.name || !json.name.match(/[a-zA-Z]+/i)) return;
		return (new this(context, json.name)).withFlag(...flags);
	}

	/**
	 * @inheritdoc
	 */
	static cloneJson(json) {
		const jsonClone = { name: json.name };
		const rebase = (obj, key) => {
			const value = obj[key];
			Object.defineProperty(obj, `$${ key }`, { get: () => value });
		};
		rebase(jsonClone, 'name');
		return jsonClone;
	}
}