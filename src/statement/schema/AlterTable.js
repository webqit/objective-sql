
/**
 * @imports
 */
import Lexer from '@webqit/util/str/Lexer.js';
import { _before, _after } from '@webqit/util/str/index.js';
import { _isObject, _isFunction } from '@webqit/util/js/index.js';
import AlterInterface from './AlterInterface.js';
import CreateTable from './CreateTable.js';
import TableLevelConstraint from './TableLevelConstraint.js';
import ColumnLevelConstraint from './ColumnLevelConstraint.js';
import Index from './Index.js';
import Column from './Column.js';
import DataType from './DataType.js';

/**
 * ---------------------------
 * AlterTable class
 * ---------------------------
 */				

export default class AlterTable extends AlterInterface {
	 
	/**
	 * @inheritdoc
	 */
	constructor(name, database, diffs, params = {}) {
		super();
		this.name = name;
		this.database = database;
		this.diffs = diffs;
		this.params = params;
		this.nodeTypes = (diffs.rename ? [ 'name' ] : []).concat(diffs.relocate ? [ 'schema' ] : []).concat([ 'columns', 'constraints', 'indexes' ].filter(key => {
			return [ 'rename', 'drop', 'add', 'alter' ].some(k => diffs[key][k].length);
		}));
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
	stringify() {
		const diffs = this.diffs, stmts = [];
		if (diffs.rename) stmts.push(`RENAME TO ${ diffs.rename }`);
		if (diffs.relocate) stmts.push(`SET SCHEMA ${ diffs.relocate }`);
		const constants = { constraints: 'CONSTRAINT', indexes: 'INDEX', columns: 'COLUMN', };
		for (const listName in constants) {
			const nameKey = listName === 'constraints' ? 'constraintName' : (listName === 'indexes' ? 'indexName' : 'name');
			for (const action in diffs[listName]) {

				// RENAME
				if (action === 'rename') stmts.push(...diffs[listName][action].map(([thingName, newName]) => {
					return `RENAME ${ constants[listName] } ${ thingName } TO ${ newName }`;
				}));

				// DROP
				if (action === 'drop') stmts.push(...diffs[listName][action].map(([dropTarget, ...flags]) => {
					const thingName = dropTarget[nameKey];
					const ifExists = flags.includes('IF EXISTS');
					const $flags = flags.join('').match(/RESTRICT|CASCADE/i) || [];
					if (this.params.dialect === 'mysql' && thingName.toUpperCase() === 'PRIMARY') {
						return `DROP PRIMARY KEY`;
					}
					return `DROP ${ this.params.dialect === 'mysql' && dropTarget.type === 'FOREIGN KEY' ? 'FOREIGN KEY' : constants[listName] }${ ifExists ? ' IF EXISTS' : '' } ${ thingName }${ $flags.length ? ` ${ $flags[0] }` : '' }`;
				}));

				// ADD
				if (action === 'add') stmts.push(...diffs[listName][action].map(([thing, ...flags]) => {
					const ifNotExists = flags.includes('IF NOT EXISTS');
					const [ , first, afterCol ] = /(FIRST)|AFTER_(\w+)/i.exec(flags.join('')) || [];
					return `ADD ${ listName === 'columns' ? `COLUMN ` : '' }${ ifNotExists ? 'IF NOT EXISTS ' : '' }${ thing }${ first ? ' FIRST' : (afterCol ? ` AFTER ${ afterCol.toLowerCase() }` : '') }`;
				}));

				// ALTER
				if (action === 'alter') {
					if (listName === 'columns') {

						// ALTER COLUMN
						stmts.push(...diffs[listName][action].reduce(($stmts, [columnName, [subAction, property, ...args]]) => {
							const asTableLevelConstraint = () => {								
								if (subAction === 'ADD') {
									$stmts = $stmts.concat(`ADD ${ TableLevelConstraint.fromColumnLevelConstraint(args[0], columnName) }`);
								} else {
									let dropStatement = dropTarget => `DROP CONSTRAINT ${ dropTarget.constraintName }`;
									if (this.params.dialect === 'mysql' && ['primaryKey', 'references'].includes(property)) {
										dropStatement = dropTarget => property === 'primaryKey' ? `DROP PRIMARY KEY` : `DROP FOREIGN KEY ${ dropTarget.constraintName }`;
									}
									if (subAction === 'DROP') {
										$stmts = $stmts.concat(dropStatement(args[0]));
									} else if (subAction === 'SET') {
										if (args[1]?.constraintName) $stmts = $stmts.concat(dropStatement(args[1])); // We process DROP first, then ADD
										$stmts = $stmts.concat(`ADD ${ TableLevelConstraint.fromColumnLevelConstraint(args[0], columnName) }`);
									}
								}
							};
							const asLiterals = () => {
								if (property) throw new Error(`Invalid operation: ALTER COLUMN ${ columnName } ${ subAction } ${ args[0] }`);
								$stmts = $stmts.concat(`ALTER COLUMN ${ columnName } ${ subAction } ${ args[0] }`);
							};
							if (this.params.dialect === 'mysql') {
								if (property === 'default') {
									$stmts = $stmts.concat(`ALTER COLUMN ${ columnName } ${ subAction === 'DROP' ? 'DROP' : 'SET' } ${ args[0] }`);
								} else if (args[0] instanceof ColumnLevelConstraint && ['primaryKey', 'references', 'uniqueKey'].includes(property)) {
									asTableLevelConstraint();
								} else {
									asLiterals();
								}
							} else {
								if (property === 'type') {
									$stmts = $stmts.concat(`ALTER COLUMN ${ columnName } SET DATA TYPE ${ args[0] }`);
								} else if (['identity', 'expression', 'default', 'notNull'].includes(property)) {
									if (subAction === 'DROP' || (property === 'identity' && subAction === 'SET')) {
										$stmts = $stmts.concat(`ALTER COLUMN ${ columnName } DROP ${ ColumnLevelConstraint.attrEquivalents[property] }${ subAction === 'DROP' && ['identity', 'expression'].includes(property) && args.includes('IF EXISTS') ? ` IF EXISTS` : '' }`);
									}
									if (['ADD', 'SET'].includes(subAction) && property !== 'expression'/* Can't add a generated expression to a column after definition */) {
										$stmts = $stmts.concat(`ALTER COLUMN ${ columnName } ${ property === 'identity' ? 'ADD' : 'SET' } ${ args[0] }`);
									}
								} else if (args[0] instanceof ColumnLevelConstraint && ['primaryKey', 'references', 'uniqueKey', 'check'].includes(property)) {
									asTableLevelConstraint();
								} else {
									asLiterals();
								}
							}
							return $stmts;
						}, []));
					} else {
						
						// ALTER CONSTRAINT/INDEX
						stmts.push(...diffs[listName][action].reduce(($stmts, [thingName, ...args]) => {
							if (typeof args[0] === 'string') {
								return $stmts.concat(`ALTER ${ constants[listName] } ${ thingName } ${ args[0] }`);
							}
							let dropStatement = `DROP ${ constants[listName] } ${ thingName }`;
							if (this.params.dialect === 'mysql' && ['PRIMARY KEY', 'FOREIGN KEY'].includes(args[0].type)) {
								dropStatement = args[0].type === 'PRIMARY KEY' ? `DROP PRIMARY KEY` : `DROP FOREIGN KEY ${ thingName }`;
							}
							$stmts = $stmts.concat(dropStatement);
							return $stmts.concat(`ADD ${ args[0] }`);
						}, []));
					}
				}
			}
		}
		return `ALTER TABLE${ this.params.ifExists ? ' IF EXISTS' : '' } ${ this.database ? `${ this.database }.` : `` }${ this.name }\n\t${ stmts.join(',\n\t') }`;
	}

	/**
	 * @inheritdoc
	 */
	toJson() {
		const diffs = {
			rename: this.diffs.rename,
			relocate: this.diffs.relocate,
			columns: { ...this.diffs.columns },
			constraints: { ...this.diffs.constraints },
			indexes: { ...this.diffs.indexes },
		};
		for (const listName in diffs) {
			if (['rename', 'relocate'].includes(listName)) continue;

			// RENAME
			diffs[listName].rename = diffs[listName].rename.slice(0);

			// DROP/ADD
			for (const k of ['drop', 'add']) {
				diffs[listName][k] = diffs[listName][k].map(([argument, ...flags]) => {
					return [argument.toJson(), ...flags];
				});
			}

			// ALTER
			if (listName === 'columns') {
				diffs[listName].alter = diffs[listName].alter.map(([ alterTargetName, [ action, property, ...args ]]) => {
					args = args.map(arg => arg instanceof DataType ? arg.toJson() : (arg instanceof ColumnLevelConstraint ? arg.toJson()[1] : arg));
					return [ alterTargetName, [ action, property, ...args ]];
				});
			} else {
				diffs[listName].alter = diffs[listName].alter.map(([ alterTargetName, ...args ]) => {
					args[0] = _isObject(args[0]) && _isFunction(args[0].toJson) ? args[0].toJson() : args[0];
					return [ alterTargetName, ...args ];
				});
			}
		}
		return {
			name: this.name,
			database: this.database,
			diffs,
		};
	}

	/**
	 * @inheritdoc
	 */
	static async parse(expr, parseCallback, params = {}) {
		const [ match, ifExists, dbName, tblName ] = /ALTER[ ]+TABLE[ ]+(IF[ ]+EXISTS[ ]+)?(?:(\w+)\.)?(\w+)/i.exec(expr) || [];
		if (!tblName) return;
		const $params = { database: dbName, ...params };
		const diffs = this.makeDiffs();
		const regex = name => new RegExp(`${ this[ name ].source }`, 'i');
		const stmts = Lexer.split(_after(expr, match), [',']).map(s => s.trim());
		for (const stmt of stmts) {

			// RENAME ... TO ...
			const [ renameMatch, renameWhatKeyword, thingId, newName ] = regex('renameRe').exec(stmt) || [];
			if (renameMatch) {
				if (thingId) {
					const listName = /KEY|INDEX/i.test(renameWhatKeyword) ? 'indexes' : renameWhatKeyword.toLowerCase() + 's';
					diffs[listName].rename.push([ thingId, newName ]);
				} else { diffs.rename = newName; }
				continue;
			}

			// REBASE ... TO ...
			const [ relocateMatch, newDabase ] = regex('relocateRe').exec(stmt) || [];
			if (relocateMatch) {
				diffs.relocate = newDabase;
				continue;
			}

			// DROP
			const [ dropMatch, dropTargetType = 'COLUMN', ifExists/* postgresql-specific */, dropTargetName, flag/* postgresql-specific */ ] = regex('dropRe').exec(stmt) || [];
			if (dropMatch) {
				const listName = /CONSTRAINT|PRIMARY[ ]+KEY|FOREIGN[ ]+KEY|CHECK/i.test(dropTargetType) ? 'constraints' : (/INDEX|KEY/i.test(dropTargetType) ? 'indexes' : 'columns');
				const constraintName = dropTargetName || dropTargetType.trim().replace(/[ ]+KEY/i, '').toUpperCase()/* when, in mysql, it's just: drop PRIMARY KEY */;
				const dropTarget = listName === 'constraints' ? new TableLevelConstraint(constraintName, dropTargetType, []/*columns*/, null, $params) : (
					listName === 'indexes' ? new Index(dropTargetName, dropTargetType, []/*columns*/, $params) : new Column(dropTargetName, null, [], $params)
				);
				const flags = [ifExists, flag].filter(s => s).map(s => s.trim().replace(/\s+/g, ' ').toUpperCase());
				diffs[listName].drop.push([dropTarget, ...flags]);
				continue;
			}

			// ADD
			const [ addMatch, columnKeyword, ifColumnNotExists, spec2 ] = regex('addRe').exec(stmt) || [];
			if (addMatch) {
				const [ , spec, flag ] = spec2.match(/(.+)[ ]+(FIRST|AFTER[ ]+\w+)$/i) || [ , spec2 ];
				const argument = await parseCallback(spec.trim(), columnKeyword ? [Column] : [TableLevelConstraint, Index, Column], $params); // Note that Column must come last
				const listName = argument instanceof TableLevelConstraint ? 'constraints' : (argument instanceof Index ? 'indexes' : 'columns');
				const flags = [ifColumnNotExists, flag].filter(s => s).map(s => s.trim().replace(/\s+/g, ' ').toUpperCase());
				diffs[listName].add.push([argument, ...flags]);
				continue;
			}

			// ALTER
			const [ alterMatch, alterTargetType, alterTargetName, $action = '', $argument = '', $ifDropTargetExits, $constraintOrIndexAttr ] = regex('alterRe').exec(stmt) || [];
			if (alterMatch) {
				const listName = /CONSTRAINT|CHECK/i.test(alterTargetType) ? 'constraints' : (/INDEX|KEY/i.test(alterTargetType) ? 'indexes' : 'columns');
				let action = $action.toUpperCase(), argument = $argument, $ = {};
				// Is column data type?
				if (action.endsWith('TYPE')) {
					argument = ['SET', 'type', await parseCallback($argument, [DataType], $params)];
				}
				// Is column constraint?
				else if ($.argument = await parseCallback($argument, [ColumnLevelConstraint], {...$params, assert: false})) {
					const property = Object.keys(ColumnLevelConstraint.attrEquivalents).find(attr => ColumnLevelConstraint.attrEquivalents[attr] === $.argument.type);
					if (action === 'DROP' && ['identity', 'default', 'notNull'].includes(property)) {
						argument = [action, property, null, ...($ifDropTargetExits ? ['IF EXISTS'] : [])];
					} else {
						argument = [action, property, $.argument];
					}
				}
				// Is SET|DROP|ADD flag?
				else if (action) {
					argument = [action, null, argument];
				}
				// Is just flag?
				else {
					argument = $constraintOrIndexAttr;
				}
				diffs[listName].alter.push([ alterTargetName, argument ]);
			}
		}
		if (ifExists) { params = { ...params, ifExists: true }; };
		return new this(tblName, dbName, diffs, params);
	}

	/**
	 * @inheritdoc
	 */
	static fromJson(json, params = {}) {
		if (!json.name || !json.name.match(/[a-zA-Z]+/i)) throw new Error(`Could not assertain table name or table name invalid.`);
		const $params = { database: json.database, ...params };
		const diffs = {
			rename: json.diffs.rename,
			relocate: json.diffs.relocate,
			columns: { ...json.diffs.columns },
			constraints: { ...json.diffs.constraints },
			indexes: { ...json.diffs.indexes },
		};
		for (const listName in diffs) {
			if (['rename', 'relocate'].includes(listName)) continue;
			const EntryClass = listName === 'constraints' ? TableLevelConstraint : (listName === 'indexes' ? Index : Column);
			
			// RENAME
			diffs[listName].rename = json.diffs[listName].rename.slice();

			// DROP/ADD
			for (const k of ['drop', 'add']) {
				diffs[listName][k] = json.diffs[listName][k].map(([argument, ...flags]) => {
					return [EntryClass.fromJson(argument, $params), ...flags];
				});
			}

			// ALTER
			if (listName === 'columns') {
				diffs[listName].alter = json.diffs[listName].alter.map(([ alterTargetName, [ action, property, ...args ]]) => {
					if (action === 'SET' && property === 'type') {
						args[0] = DataType.fromJson(args[0], params);
					} else {
						args = args.map(arg => ColumnLevelConstraint.fromJson(property, arg, $params) || arg);
					}
					return [ alterTargetName, [ action, property, ...args ]];
				});
			} else {
				diffs[listName].alter = json.diffs[listName].alter.map(([ alterTargetName, ...args ]) => {
					args[0] = EntryClass.fromJson(args[0], $params) || args[0];
					return [ alterTargetName, ...args ];
				});
			}
		}
		return new this(json.name, json.database, diffs, params);
	}

	/**
	 * @inheritdoc
	 */
	static fromDiffing(jsonA, jsonB, params = {}) {
		if (!jsonA.name || !jsonA.name.match(/[a-zA-Z]+/i)) throw new Error(`Could not assertain table1 name or table1 name invalid.`);
		if (!jsonB.name || !jsonB.name.match(/[a-zA-Z]+/i)) throw new Error(`Could not assertain table2 name or table2 name invalid.`);
		const $params = { database: jsonB.database || jsonA.database, ...params };
		const diffs = this.makeDiffs();
		// Start with naming
		if (jsonB.name !== jsonA.name) { diffs.rename = jsonB.name; }
		if (jsonB.database !== jsonA.database) { diffs.relocate = jsonB.database; }
		for (const listName in diffs) {
			if (['rename', 'relocate'].includes(listName)) continue;
			// Main diffing
			const nameKey = listName === 'constraints' ? 'constraintName' : (listName === 'indexes' ? 'indexName' : 'name');
			const [ namesA, namesB, namesAll ] = this.makeSets(jsonA[listName], jsonB[listName], nameKey);
			for (const name of namesAll) {
				const entryA = jsonA[listName].find(entry => entry[nameKey] === name);
				const entryB = jsonB[listName].find(entry => (`$${ nameKey }` in entry ? entry[`$${ nameKey }`] : entry[nameKey]) === name);
				const EntryClass = listName === 'constraints' ? TableLevelConstraint : (listName === 'indexes' ? Index : Column);
				if (namesA.has(name) && !namesB.has(name)) {

					// Drop
					diffs[listName].drop.push([ EntryClass.fromJson(entryA, $params) || entryA ]);
				} else if (!namesA.has(name) && namesB.has(name)) {

					// Add
					diffs[listName].add.push([ EntryClass.fromJson(entryB, $params) ]);
				} else if (namesA.has(name) && namesB.has(name)) {

					// Alter
					if (listName === 'columns') {
						const [ attrsA, attrsB, attrsAll ] = this.makeSets(entryA, entryB);
						for (const attr of attrsAll) {
							if ((attrsA.has(attr) && entryA[attr]) && (!attrsB.has(attr) || !entryB[attr])) {
								
								// Drop
								if (['identity', 'default', 'notNull'].includes(attr)) {
									// Well while both pg and my support DROP DEFAULT, only pg supports DROP NOT NULL
									diffs[listName].alter.push([ name, [ 'DROP', attr ] ]);
								} else {
									diffs[listName].alter.push([ name, [ 'DROP', attr, ColumnLevelConstraint.fromJson(attr, entryA[attr], $params) || entryA[attr] ] ]);
								}
							} else if ((!attrsA.has(attr) || !entryA[attr]) && (attrsB.has(attr) && entryB[attr])) {

								// Add
								diffs[listName].alter.push([ name, [ 'ADD', attr, ColumnLevelConstraint.fromJson(attr, entryB[attr], $params) || entryB[attr]  ]]);
							} else if (attrsA.has(attr) && attrsB.has(attr) && !this.isSame(entryA[attr], entryB[attr])) {
								
								// Rename/alter
								if (attr === 'name') {
									// Column rename
									diffs[listName].rename.push([ name, entryB[attr] ]);
								} else if (attr === 'type') {
									// Change data type
									diffs[listName].alter.push([ name, [ 'SET', attr, DataType.fromJson(entryB[attr], $params) ] ]);
								} else if (attr in ColumnLevelConstraint.attrEquivalents) {
									const inlineConstraintB = ColumnLevelConstraint.fromJson(attr, entryB[attr], $params);
									const inlineConstraintA = ColumnLevelConstraint.fromJson(attr, entryA[attr], $params);
									diffs[listName].alter.push([ name, [ 'SET', attr, inlineConstraintB, inlineConstraintA ] ]);
								} else {
									// Other
									diffs[listName].alter.push([ name, [ 'SET', attr, entryB[attr] ]]);
								}
							}
						}
					} else if (!this.isSame(entryA, entryB)) {

						// Alter constraint/index
						const EntryClass = listName === 'constraints' ? TableLevelConstraint : Index;
						diffs[listName].alter.push([ name, EntryClass.fromJson(entryB, $params) ]);
					}
				}
			}
		}
		const instance = new this(jsonA.name, jsonA.database, diffs, params);
		instance.jsonA = jsonA;
		return instance;
	}

	/**
	 * @inheritdoc
	 */
	static fromDiffing2d(jsonsA, jsonsB, params = {}) {
		const nameKey = 'name', [ namesA, namesB, namesAll ] = this.makeSets(jsonsA, jsonsB, nameKey);
		const diffs = { drop: [], add: [], alter: [] };
		for (const name of namesAll) {
			if (namesA.has(name) && !namesB.has(name)) {

				// Drop
				diffs.drop.push(name);
			} else if (!namesA.has(name) && namesB.has(name)) {

				// Add
				const entryB = jsonsB.find(tblSchema => (`$${ nameKey }` in tblSchema ? tblSchema[`$${ nameKey }`] : tblSchema[nameKey]) === name);
				diffs.add.push(CreateTable.fromJson(entryB, params));
			} else if (namesA.has(name) && namesB.has(name)) {

				// Alter
				const entryA = jsonsA.find(tblSchema => tblSchema[nameKey] === name);
				const entryB = jsonsB.find(tblSchema => (`$${ nameKey }` in tblSchema ? tblSchema[`$${ nameKey }`] : tblSchema[nameKey]) === name);
				const tblAltInstance = this.fromDiffing(entryA, entryB, params);
				if (tblAltInstance.nodeTypes.length) {
					diffs.alter.push(tblAltInstance);
				}
			}
		}
		return diffs;
	}

	/**
	 * @helper
	 */
	static makeDiffs() {
		return [ 'columns', 'constraints', 'indexes' ].reduce((diffs, key) => {
			return { ...diffs, [key]: { drop: [], add: [], alter: [], rename: [] } };
		}, {});
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
