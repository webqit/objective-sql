
import StatementNode from '../StatementNode.js';

export default class AlterDatabase extends StatementNode {
	 
	/**
	 * Instance properties
	 */
	TARGET = {};
	ACTIONS = [];

	/**
	 * @constructor
	 */
	constructor(context, target) {
		super(context);
		this.TARGET = target;
	}

	/**
	 * Adds a "rename" action to the instance,
	 * 
	 * @param String newName
	 * 
	 * @returns this
	 */
	renameTo(newName) {
		this.ACTIONS.push({ type: 'RENAME', argument: newName });
		return this;
	}

	/**
	 * @inheritdoc
	 */
	toJson() {
		return {
			target: this.TARGET,
			actions: this.ACTIONS.map(action => structuredClone(action)),
		};
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() {
		const newDbName = this.ACTIONS.find(action => action.type === 'RENAME')?.argument;
		if (!newDbName) return '';
		return `ALTER SCHEMA${ this.hasFlag('IF_EXISTS') ? ' IF EXISTS' : '' } ${ this.TARGET.name } RENAME TO ${ newDbName }`;
	}

	/**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		const [ , ifExists, dbName, newName ] = /ALTER[ ]+DATABASE[ ]+(IF[ ]+EXISTS[ ]+)?(\w+)[ ]+RENAME[ ]+TO[ ]+(\w+)/i.exec(expr) || [];
		if (!dbName) return;
		const instance = new this(context, { name: dbName });
		if (ifExists) instance.withFlag('IF_EXISTS');
		return instance.renameTo(newName);
	}

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json, flags = []) {
		if (!json.target?.name?.match(/[a-zA-Z]+/i)) return;
		const instance = (new this(context, json.target)).withFlag(...flags);
		for (const action of json.actions) {
			instance.ACTIONS.push(structuredClone(action));
		}
		return instance;
	}
	
	/**
	 * @inheritdoc
	 */
	static fromDiffing(context, jsonA, jsonB, flags = []) {
		if (!jsonA.name?.match(/[a-zA-Z]+/i)) throw new Error(`Could not assertain database1 name or database1 name invalid.`);
		if (!jsonB.name?.match(/[a-zA-Z]+/i)) throw new Error(`Could not assertain database2 name or database2 name invalid.`);
		const instance = (new this(context, jsonA)).withFlag(...flags);
		// RENAME TO...
		if (jsonB.name !== jsonA.name) {
			instance.renameTo(jsonB.name);
		}
		return instance;
	}

}