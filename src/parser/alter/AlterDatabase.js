
import StatementNode from '../StatementNode.js';
import Action from './Action.js';

export default class AlterDatabase extends StatementNode {
	 
	/**
	 * Instance properties
	 */
	NAME = '';
	ACTIONS = [];

	/**
	 * @constructor
	 */
	constructor(context, name) {
		super(context);
		this.NAME = name;
	}

	/**
	 * Adds a "RENAME" action to the instance,
	 * 
	 * @param String newName
	 * 
	 * @returns Action
	 */
	renameTo(newName) { return this.build('ACTIONS', [newName], Action, 'renameTo'); }

	/**
	 * @inheritdoc
	 */
	toJson() {
		return {
			name: this.NAME,
			actions: this.ACTIONS.map(action => action.toJson()),
		};
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() {
		const newDbName = this.ACTIONS.find(action => action.TYPE === 'RENAME' && !action.REFERENCE)?.ARGUMENT;
		if (!newDbName) return '';
		return `ALTER SCHEMA${ this.hasFlag('IF_EXISTS') ? ' IF EXISTS' : '' } ${ this.autoEsc(this.NAME) } RENAME TO ${ this.autoEsc(newDbName) }`;
	}

	/**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		const [ , ifExists, dbName, newName ] = /ALTER\s+DATABASE\s+(IF\s+EXISTS\s+)?(\w+)\s+RENAME\s+TO\s+(\w+)/i.exec(expr) || [];
		if (!dbName) return;
		const instance = new this(context, dbName);
		if (ifExists) instance.withFlag('IF_EXISTS');
		return instance.renameTo(newName);
	}

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json, flags = []) {
		if (!json.name) return;
		const instance = (new this(context, json.name)).withFlag(...flags);
		for (const action of json.actions) {
			instance.ACTIONS.push(Action.fromJson(context, action));
		}
		return instance;
	}
	
	/**
	 * @inheritdoc
	 */
	static fromDiffing(context, jsonA, jsonB, flags = []) {
		if (!jsonA.name) throw new Error(`Could not assertain database1 name or database1 name invalid.`);
		if (!jsonB.name) throw new Error(`Could not assertain database2 name or database2 name invalid.`);
		const instance = (new this(context, jsonA.name)).withFlag(...flags);
		// RENAME TO...
		if (jsonB.name !== jsonA.name) {
			instance.renameTo(jsonB.name);
		}
		return instance;
	}

}