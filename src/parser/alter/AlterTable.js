
import Lexer from '@webqit/util/str/Lexer.js';
import { _after } from '@webqit/util/str/index.js';
import { _isObject, _isFunction } from '@webqit/util/js/index.js';
import StatementNode from '../StatementNode.js';
import CreateTable from '../create/CreateTable.js';
import TableLevelConstraint from '../create/TableLevelConstraint.js';
import ColumnLevelConstraint from '../create/ColumnLevelConstraint.js';
import DataType from '../create/DataType.js';
import Column from '../create/Column.js';
import Index from '../create/Index.js';

export default class AlterTable extends StatementNode {

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
	 * @property String
	 */
	get BASENAME() { return this.CONTEXT/*Database*/.name; }

	/**
	 * Adds a "RENAME" action to the instance,
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
	 * Adds a "RELOCATE" action to the instance,
	 * 
	 * @param String newName
	 * 
	 * @returns this
	 */
	relocateTo(newDb) {
		this.ACTIONS.push({ type: 'RELOCATE', argument: newDb });
		return this;
	}

	/**
	 * Adds a "DROP" action to the instance,
	 * 
	 * @param Object argument
	 * 
	 * @returns this
	 */
	drop(argument, flags = []) {
		this.ACTIONS.push({ type: 'DROP', argument, flags });
		return this;
	}

	/**
	 * Adds a "ADD" action to the instance,
	 * 
	 * @param Object argument
	 * 
	 * @returns this
	 */
	add(argument, flags = []) {
		this.ACTIONS.push({ type: 'ADD', argument, flags });
		return this;
	}

	/**
	 * Adds a "ALTER" action to the instance,
	 * 
	 * @param Object reference
	 * @param String action
	 * @param Any argumentNew
	 * @param Any argumentOld
	 * @param Object flags
	 * 
	 * @returns this
	 */
	alter(reference, action, argumentNew, argumentOld = null, flags = []) {
		this.ACTIONS.push({ type: 'ALTER', reference, action, argumentNew, argumentOld, flags });
		return this;
	}

	/**
	 * @inheritdoc
	 */
	toJson() {
		return {
			target: this.TARGET,
			actions: this.ACTIONS.map(action => {
				// ADD
				if (['DROP','ADD'].includes(action.type)) {
					return { ...action, argument: action.argument.toJson() };
				}
				// ALTER
				if (action.type === 'ALTER') {
					const argumentNew = _isObject(action.argumentNew) && _isFunction(action.argumentNew.toJson) ? action.argumentNew.toJson() : action.argumentNew;
					const argumentOld = _isObject(action.argumentOld) && _isFunction(action.argumentOld.toJson) ? action.argumentOld.toJson() : action.argumentOld;
					return { ...action, argumentNew, argumentOld };
				}
				// DROP, RENAME, RELOCATE
				return structuredClone(action);
			}),
		};
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() {
		if (!this.ACTIONS.length) return '';
		const stmts0 = [], stmts1 = [];
		for (const action of this.ACTIONS) {
			// RENAME TO...
			if (action.type === 'RENAME') {
				stmts0.push(`RENAME TO ${ action.argument }`);
				continue;
			}
			// RELOCATE TO...
			if (action.type === 'RELOCATE') {
				stmts0.push(`SET SCHEMA ${ action.argument }`);
				continue;
			}
			// DROP
			if (action.type === 'DROP') {
				const ifExists = action.flags?.includes('IF_EXISTS');
				const $flags = (action.flags?.join(' ') || '').match(/RESTRICT|CASCADE/i) || [];
				const nodeType = action.argument instanceof TableLevelConstraint ? 'CONSTRAINT' : (action.argument instanceof Index ? 'INDEX' : 'COLUMN');
				if (this.params.dialect === 'mysql' && nodeType === 'CONSTRAINT' && action.argument.CONSTRAINT_NAME === 'PRIMARY') {
					stmts1.push(`DROP PRIMARY KEY`);
				} else {
					const nameKey = nodeType === 'CONSTRAINT' ? 'CONSTRAINT_NAME' : (nodeType === 'INDEX' ? 'INDEX_NAME' : 'NAME');
					stmts1.push(`DROP ${ this.params.dialect === 'mysql' && nodeType === 'CONSTRAINT' && action.argument.TYPE/* being a table-level constraint */ === 'FOREIGN KEY' ? 'FOREIGN KEY' : nodeType }${ ifExists ? ' IF EXISTS' : '' } ${ action.argument[nameKey] }${ $flags.length ? ` ${ $flags[0] }` : '' }`);
				}
				continue;
			}
			// ADD
			if (action.type === 'ADD') {
				const ifNotExists = action.flags?.includes('IF_NOT_EXISTS');
				const [ , first, afterCol ] = /(FIRST)|AFTER[ ]+(\w+)/i.exec(action.flags?.join(' ') || '') || [];
				stmts1.push(`ADD ${ action.argument instanceof Column ? `COLUMN ` : '' }${ ifNotExists ? 'IF NOT EXISTS ' : '' }${ action.argument }${ first ? ' FIRST' : (afterCol ? ` AFTER ${ afterCol.toLowerCase() }` : '') }`);
				if (this.params.dialect === 'mysql' && action.argument instanceof Column) {
					const constraint = action.argument.CONSTRAINTS.find(c => c.ATTRIBUTE === 'REFERENCES');
					if (constraint) stmts1.push(`ADD ${ TableLevelConstraint.fromColumnLevelConstraint(constraint, action.argument.NAME) }`);
				}
				continue;
			}
			// ALTER
			if (action.type === 'ALTER') {
				// Handle columns specially
				const { action: subAction, argumentNew, argumentOld } = action;
				// RENAME
				if (subAction === 'RENAME') {
					stmts1.push(`RENAME ${ action.reference.type } ${ action.reference.name } TO ${ argumentNew }`);
					continue;
				}
				if (action.reference.type === 'COLUMN') {
					const asTableLevelConstraint = () => {								
						if (subAction === 'ADD') {
							stmts1.push(`ADD ${ TableLevelConstraint.fromColumnLevelConstraint(argumentNew, action.reference.name) }`);
						} else {
							let dropStatement = dropTarget => `DROP CONSTRAINT ${ dropTarget.CONSTRAINT_NAME }`;
							if (this.params.dialect === 'mysql' && ['PRIMARY KEY', 'REFERENCES'].includes(dropTarget.ATTRIBUTE)) {
								dropStatement = dropTarget => dropTarget.ATTRIBUTE === 'PRIMARY KEY' ? `DROP PRIMARY KEY` : `DROP FOREIGN KEY ${ dropTarget.CONSTRAINT_NAME }`;
							}
							if (subAction === 'DROP') {
								stmts1.push(dropStatement(argumentNew));
							} else if (subAction === 'SET') {
								if (argumentOld?.CONSTRAINT_NAME) { stmts1.push(dropStatement(argumentOld)); } // We process DROP first, then ADD
								stmts1.push(`ADD ${ TableLevelConstraint.fromColumnLevelConstraint(argumentNew, action.reference.name) }`);
							}
						}
					};
					const asLiterals = () => {
						stmts1.push(`ALTER COLUMN ${ action.reference.name } ${ subAction } ${ argumentNew }`);
					};
					if (this.params.dialect === 'mysql') {
						if (argumentNew instanceof ColumnLevelConstraint) {
							if (argumentNew.ATTRIBUTE === 'DEFAULT') {
								stmts1.push(`ALTER COLUMN ${ action.reference.name } ${ subAction === 'DROP' ? 'DROP' : 'SET' } ${ argumentNew }`);
							} else if (['PRIMARY KEY', 'REFERENCES', 'UNIQUE'].includes(argumentNew.ATTRIBUTE)) {
								asTableLevelConstraint();
							} else {
								asLiterals();
							}
						} else {
							asLiterals();
						}
					} else {
						if (argumentNew instanceof DataType) {
							stmts1.push(`ALTER COLUMN ${ action.reference.name } SET DATA TYPE ${ argumentNew }`);
						} else if (argumentNew instanceof ColumnLevelConstraint) {
							if (['IDENTITY', 'EXPRESSION', 'DEFAULT', 'NOT NULL'].includes(argumentNew.ATTRIBUTE)) {
								if (subAction === 'DROP' || (argumentNew.ATTRIBUTE === 'IDENTITY' && subAction === 'SET')) {
									stmts1.push(`ALTER COLUMN ${ action.reference.name } DROP ${ argumentNew.ATTRIBUTE }${ subAction === 'DROP' && ['IDENTITY', 'EXPRESSION'].includes(argumentNew.ATTRIBUTE) && action.flags?.includes('IF_EXISTS') ? ` IF EXISTS` : '' }`);
								}
								if (['ADD', 'SET'].includes(subAction) && argumentNew.ATTRIBUTE !== 'EXPRESSION'/* Can't add a generated expression to a column after definition */) {
									stmts1.push(`ALTER COLUMN ${ action.reference.name } ${ argumentNew.ATTRIBUTE === 'IDENTITY' ? 'ADD' : 'SET' } ${ argumentNew }`);
								}
							} else if (['PRIMARY KEY', 'REFERENCES', 'UNIQUE', 'CHECK'].includes(argumentNew.ATTRIBUTE)) {
								asTableLevelConstraint();
							} else {
								asLiterals();
							}
						} else {
							asLiterals();
						}
					}
					continue;
				}
				if (typeof argumentNew === 'string') {
					stmts1.push(`ALTER ${ action.reference.type } ${ action.reference.name } ${ argumentNew }`);
					continue;
				}
				// From constraints diffing
				let dropStatement = `DROP ${ action.reference.type } ${ action.reference.name }`;
				if (this.params.dialect === 'mysql' && ['PRIMARY KEY', 'FOREIGN KEY'].includes(argumentNew.TYPE/* being a table-level constraint */)) {
					dropStatement = argumentNew.ATTRIBUTE === 'PRIMARY KEY' ? `DROP PRIMARY KEY` : `DROP FOREIGN KEY ${ action.reference.name }`;
				}
				stmts1.push(dropStatement, `ADD ${ argumentNew }`);
				continue;
			}
		}
		return `ALTER TABLE${ this.hasFlag('IF_EXISTS') ? ' IF EXISTS' : '' } ${ this.TARGET.basename ? `${ this.TARGET.basename }.` : `` }${ this.TARGET.name }\n\t${ [...stmts1, ...stmts0].join(',\n\t') }`;
	}

	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		const [ match, ifExists, dbName, tblName ] = /ALTER[ ]+TABLE[ ]+(IF[ ]+EXISTS[ ]+)?(?:(\w+)\.)?(\w+)/i.exec(expr) || [];
		if (!tblName) return;
		const target = { name: tblName, basename: dbName };
		const instance = new this(context, target);
		if (ifExists) instance.withFlag('IF_EXISTS');
		// ----------
		const regex = name => new RegExp(`${ this[ name ].source }`, 'i');
		const stmts = Lexer.split(_after(expr, match), [',']).map(s => s.trim());
		for (const stmt of stmts) {
			// RENAME ... TO ...
			const [ renameMatch, nodeType_a, nodeName_a, newName_a ] = regex('renameRe').exec(stmt) || [];
			if (renameMatch) {
				if (nodeName_a) {
					const nodeType = /KEY|INDEX/i.test(nodeType_a) ? 'INDEX' : nodeType_a.toUpperCase();
					const reference = { type: nodeType, name: nodeName_a };
					instance.alter(reference, 'RENAME', newName_a);
				} else {
					instance.renameTo(newName_a);
				}
				continue;
			}
			// RELOCATE ... TO ...
			const [ relocateMatch, newSchema ] = regex('relocateRe').exec(stmt) || [];
			if (relocateMatch) {
				instance.relocateTo(newSchema);
				continue;
			}
			// DROP
			const [ dropMatch, nodeType_b = 'COLUMN', ifExists_b/* postgresql-specific */, nodeName_b, flags_b/* postgresql-specific */ ] = regex('dropRe').exec(stmt) || [];
			if (dropMatch) {
				const nodeType = /CONSTRAINT|PRIMARY[ ]+KEY|FOREIGN[ ]+KEY|CHECK/i.test(nodeType_b) ? 'CONSTRAINT' : (/INDEX|KEY/i.test(nodeType_b) ? 'INDEX' : 'COLUMN');
				const nodeName = nodeName_b || nodeType_b.trim().replace(/[ ]+KEY/i, '').toUpperCase()/* when, in mysql, it's just: drop PRIMARY KEY */;
				const argument = nodeType === 'CONSTRAINT' ? new TableLevelConstraint(instance, nodeName, nodeType_b.trim().toUpperCase(), []/*columns*/, null) : (
					nodeType === 'INDEX' ? new Index(instance, nodeName, nodeType_b.trim().toUpperCase(), []/*columns*/) : new Column(instance, nodeName, null, [])
				);
				const flags = [ifExists_b, flags_b].filter(s => s).map(s => s.trim().replace(/\s+/g, '_').toUpperCase());
				instance.drop(argument, flags);
				continue;
			}
			// ADD
			const [ addMatch, columnKeyword_c, ifColumnNotExists_c, spec_c ] = regex('addRe').exec(stmt) || [];
			if (addMatch) {
				const [ , $spec, $flags ] = spec_c.match(/(.+)[ ]+(FIRST|AFTER[ ]+\w+)$/i) || [ , spec_c ];
				const argument = await parseCallback(instance, $spec.trim(), columnKeyword_c ? [Column] : [TableLevelConstraint, Index, Column]); // Note that Column must come last
				const flags = [ifColumnNotExists_c, $flags].filter(s => s).map(s => s.trim().replace(/\s+/g, '_').toUpperCase());
				instance.add(argument, flags);
				continue;
			}
			// ALTER
			const [ alterMatch, nodeType_d, nodeName_d, subAction_d = '', argument_d = '', ifNodeExits_d, constraintOrIndexAttr_d ] = regex('alterRe').exec(stmt) || [];
			if (alterMatch) {
				const nodeType = /CONSTRAINT|CHECK/i.test(nodeType_d) ? 'CONSTRAINT' : (/INDEX|KEY/i.test(nodeType_d) ? 'INDEX' : 'COLUMN');
				const subAction = subAction_d.toUpperCase() || 'SET', flags = ifNodeExits_d ? ['IF_EXISTS'] : [], $ = {};
				let argumentNew;
				// Is column data type?
				if (subAction.endsWith('TYPE')) {
					argumentNew = await parseCallback(instance, argument_d, [DataType]);
				}
				// Is column constraint?
				else if ($.argument = await parseCallback(instance, argument_d, [ColumnLevelConstraint], { assert: false })) {
					argumentNew = $.argument;
				}
				// Is SET|DROP|ADD flag?
				else if (subAction) {
					argumentNew = argument_d;
				}
				// Is just flag?
				else {
					argumentNew = constraintOrIndexAttr_d;
				}
				// Push
				const reference = { type: nodeType, name: nodeName_d };
				instance.alter(reference, subAction, argumentNew, null, flags);
			}
		}
		return instance;
	}

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json, flags = []) {
		if (!json.target?.name?.match(/[a-zA-Z]+/i)) return;
		const instance = (new this(context, json.target)).withFlag(...flags);
		for (const action of json.actions) {
			// RENAME/RELOCATE
			if (['RENAME','RELOCATE'].includes(action.type)) {
				(action.type === 'RENAME' ? instance.renameTo : instance.relocateTo)(action.argument);
				continue;
			}
			// DROP/ADD
			if (['DROP','ADD'].includes(action.type)) {
				const argument = [TableLevelConstraint,Index,Column].reduce((prev, Class) => prev || Class.fromJson(instance, action.argument), null);
				(action.type === 'DROP' ? instance.drop : instance.add)(argument);
				continue;
			}
			// ALTER
			if (action.type === 'ALTER') {
				// Handle columns specially
				const { action: subAction, argumentNew, argumentOld } = action;
				let $args = [argumentNew, argumentOld];
				if (action.reference.type === 'COLUMN') {
					$args = $args.map(arg => [ColumnLevelConstraint,DataType].reduce((prev, Class) => prev || Class.fromJson(instance, arg), null) || arg);
				} else {
					const Class = action.reference.type === 'CONSTRAINT' ? TableLevelConstraint : Index;
					$args = $args.map(arg => Class.fromJson(instance, arg) || arg);
				}
				instance.alter(action.reference, subAction, $args.shift(), $args.shift(), action.flags);
				continue;
			}
		}
		return instance;
	}

	static fromDiffing(context, jsonA, jsonB, flags = []) {
		if (!jsonA.name?.match(/[a-zA-Z]+/i)) throw new Error(`Could not assertain table1 name or table1 name invalid.`);
		if (!jsonB.name?.match(/[a-zA-Z]+/i)) throw new Error(`Could not assertain table2 name or table2 name invalid.`);
		const instance = (new this(context, jsonA)).withFlag(...flags);
		// RENAME TO...
		if (jsonB.name !== jsonA.name) {
			instance.renameTo(jsonB.name);
		}
		// RELOCATE ... TO ...
		if (jsonB.basename !== jsonA.basename) {
			instance.relocateTo(jsonB.basename);
		}
		// DIFF STRUCTURE
		for (const listName of ['columns', 'constraints', 'indexes']) {
			const nameKey = listName === 'constraints' ? 'constraintName' : (listName === 'indexes' ? 'indexName' : 'name');
			const nodeType = listName === 'constraints' ? 'CONSTRAINT' : (listName === 'indexes' ? 'INDEX' : 'COLUMN');
			const NodeClass = nodeType === 'CONSTRAINT' ? TableLevelConstraint : (nodeType === 'INDEX' ? Index : Column);
			const [ namesA, namesB, namesAll ] = makeSets(jsonA[listName], jsonB[listName], nameKey);
			// --------
			for (const nodeName of namesAll) {
				const nodeA = jsonA[listName].find(node => node[nameKey] === nodeName);
				const nodeB = jsonB[listName].find(node => (`$${ nameKey }` in node ? node[`$${ nameKey }`] : node[nameKey]) === nodeName);
				const reference = { type: nodeType, name: nodeName };
				if (namesA.has(nodeName) && !namesB.has(nodeName)) {
					// DROP
					instance.drop(NodeClass.fromJson(instance, nodeA));
				} else if (!namesA.has(nodeName) && namesB.has(nodeName)) {
					// ADD
					instance.add(NodeClass.fromJson(instance, nodeB));
				} else if (namesA.has(nodeName) && namesB.has(nodeName)) {
					// ALTER
					if (nodeType === 'COLUMN') {
						const [ propsA, propsB, propsAll ] = makeSets(nodeA, nodeB);
						for (const property of propsAll) {
							const createArg = node => {
								const attrEquivalent = ColumnLevelConstraint.attrEquivalents[property];
								if (attrEquivalent) {
									const { constraintName, ...detail } = node[property];
									return ColumnLevelConstraint.fromJson(instance, { constraintName, attribute: attrEquivalent, detail });
								}
								return { attribute: property, value: node[property] };
							};
							if ((propsA.has(property) && nodeA[property]) && (!propsB.has(property) || !nodeB[property])) {
								// Drop
								instance.alter(reference, 'DROP', createArg(nodeA) );
							} else if ((!propsA.has(property) || !nodeA[property]) && (propsB.has(property) && nodeB[property])) {
								// Add
								instance.alter(reference, 'ADD', createArg(nodeB) );
							} else if (propsA.has(property) && propsB.has(property) && !isSame(nodeA[property], nodeB[property])) {
								// Rename/alter
								if (property === 'name') {
									// Column rename
									instance.alter(reference, 'RENAME', nodeB[property] );
								} else if (property === 'type') {
									// Change data type
									instance.alter(reference, 'SET', DataType.fromJson(instance, nodeB[property]) );
								} else {
									instance.alter(reference, 'SET', createArg(nodeB), createArg(nodeA) );
								}
							}
						}
					} else if (!isSame(nodeA, nodeB)) {
						// Alter constraint/index
						instance.alter(reference, 'SET', NodeClass.fromJson(instance, nodeB), NodeClass.fromJson(instance, nodeA) );
					}
				}
			}
		}
		return instance;
	}

	/**
	 * @inheritdoc
	 */
	static fromDiffing2d(context, jsonsA, jsonsB, flags = []) {
		const nameKey = 'name';
		const actions = [], [ namesA, namesB, namesAll ] = makeSets(jsonsA, jsonsB, nameKey);
		for (const nodeName of namesAll) {
			if (namesA.has(nodeName) && !namesB.has(nodeName)) {
				// DROP
				actions.push({ type: 'DROP', argument: nodeName });
			} else if (!namesA.has(nodeName) && namesB.has(nodeName)) {
				// ADD
				const nodeB = jsonsB.find(tblSchema => (`$${ nameKey }` in tblSchema ? tblSchema[`$${ nameKey }`] : tblSchema[nameKey]) === nodeName);
				actions.push({ type: 'ADD', argument: CreateTable.fromJson(context, nodeB, flags) });
			} else if (namesA.has(nodeName) && namesB.has(nodeName)) {
				// ALTER
				const nodeA = jsonsA.find(tblSchema => tblSchema[nameKey] === nodeName);
				const nodeB = jsonsB.find(tblSchema => ( tblSchema[`$${ nameKey }`] || tblSchema[nameKey]) === nodeName);
				const tblAltInstance = this.fromDiffing(context, nodeA, nodeB, flags);
				if (tblAltInstance.ACTIONS.length) {
					actions.push({ type: 'ALTER', argument: tblAltInstance });
				}
			}
		}
		return actions;
	}

    /**
	 * @property RegExp
	 */
	static renameRe = /^RENAME[ ]+(?:(?:(COLUMN|CONSTRAINT|INDEX|KEY)[ ]+)?(\w+)[ ]+)?(?:TO|AS)[ ]+(\w+)/;
	static relocateRe = /^SET[ ]+SCHEMA[ ]+(\w+)$/;
	static addRe = /^ADD[ ]+(COLUMN[ ]+)?(IF[ ]+NOT[ ]+EXISTS[ ]+)?(.+)$/;
	static dropRe = /^DROP[ ]+(COLUMN[ ]+|CONSTRAINT[ ]+|PRIMARY[ ]+KEY|FOREIGN[ ]+KEY[ ]+|CHECK[ ]+|INDEX[ ]+|KEY[ ]+)?(IF[ ]+EXISTS[ ]+)?(\w+)?(?:[ ]+(RESTRICT|CASCADE))?/;
	static alterRe = /^ALTER[ ]+(?:(COLUMN|CONSTRAINT|CHECK|INDEX|KEY)[ ]+)?(\w+)[ ]+(?:(ADD|DROP|(?:SET(?:[ ]+DATA[ ]+)?)?(?:TYPE)?)[ ]+(.+)(IF[ ]+EXISTS)?$|(VISIBLE|(?:NOT[ ]+)?INVISIBLE|NOT[ ]+ENFORCED|ENFORCED|DEFERRABLE|NOT[ ]+DEFERRABLE|INITIALLY[ ]+DEFERRED|INITIALLY[ ]+IMMEDIATE))/;
}

function makeSets(a, b, nameKey) {
	if (Array.isArray(a)) {
		a = a.map(x => x[nameKey]);
		b = b.map(x => `$${ nameKey }` in x ? x[`$${ nameKey }`] : x[nameKey]);
	} else {
		a = Object.keys(a);
		b = Object.keys(b).filter(s => !s.startsWith('$'));
	}
	a = new Set(a);
	b = new Set(b);
	const ab = new Set([ ...a, ...b ]);
	return [ a, b, ab ];
}

function isSame(a, b) {
	if (a === b) return true;
	if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
		const $b = b.slice(0).sort();
		return a.slice(0).sort().every((x, i) => isSame(x, $b[i]));
	}
	const temp = {};
	if (typeof a === 'object' && a && typeof b === 'object' && b && (temp.keys_a = Object.keys(a)).length === (temp.keys_b = Object.keys(b)).length) {
		return temp.keys_a.reduce((prev, k) => prev && isSame(a[k], b[k]), true);
	}
	return false;
}