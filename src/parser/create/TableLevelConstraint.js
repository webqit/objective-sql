import { _after } from '@webqit/util/str/index.js';
import { matchReferentialRule, serializeReferentialRule } from './ColumnLevelConstraint.js';
import Node from '../Node.js';

export default class TableLevelConstraint extends Node {

	/**
	 * Instance properties
	 */
	CONSTRAINT_NAME = '';
	TYPE = '';
	COLUMNS = [];
	REFERENCES = {};
	EXPR = '';

    /**
	 * @constructor
	 */
    constructor(context, constraintName, type, columns, detail) {
        super(context);
        this.CONSTRAINT_NAME = constraintName;
        this.TYPE = type;
        this.COLUMNS = columns;
		if (type === 'FOREIGN KEY') {
			this.REFERENCES = detail;
		} else if (type === 'CHECK') {
			this.EXPR = detail;
		}
    }

	/**
	 * @property String
	 */
	get BASENAME() { return this.CONTEXT/*Create|AlterTable*/.BASENAME; }

	/**
	 * @inheritdoc
	 */
	toJson() {
		return {
			...(this.CONSTRAINT_NAME ? { constraintName: this.CONSTRAINT_NAME } : {}),
			type: this.TYPE,
			...(this.COLUMNS.length ? { columns: this.COLUMNS } : {}),
			// Either of the below
			...(this.TYPE === 'FOREIGN KEY' ? { references: { ...this.REFERENCES } } : {}),
			...(this.EXPR ? { expr: this.EXPR } : {}),
		};
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() {
        let sql = `${ this.CONSTRAINT_NAME?.match(/[a-zA-Z]+/i) ? `CONSTRAINT ${ this.CONSTRAINT_NAME } ` : '' }${ this.TYPE }`;
		if (this.COLUMNS?.length && this.TYPE !== 'CHECK') { sql += ` (${ this.COLUMNS.join(',') })`; }
		if (this.TYPE === 'FOREIGN KEY') {
			const basename = this.REFERENCES.basename || this.BASENAME;
			sql += ` REFERENCES ${ basename ? `${ basename }.` : `` }${ this.REFERENCES.table } (${ this.REFERENCES.columns.join(',') })`;
			if (this.REFERENCES.matchRule) { sql += ` MATCH ${ this.REFERENCES.matchRule }`; }
			if (this.REFERENCES.updateRule) { sql += ` ON UPDATE ${ serializeReferentialRule(this.REFERENCES.updateRule) }`; }
			if (this.REFERENCES.deleteRule) { sql += ` ON DELETE ${ serializeReferentialRule(this.REFERENCES.deleteRule) }`; }
		} else if (this.TYPE === 'CHECK') {
			sql += ` (${ this.EXPR })`;
		}
		return sql;
	}

    /**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		const [ idMatch, constraintName = '' ] = (new RegExp(`^${ this.constraintNameRe.source }`, 'i')).exec(expr) || [];
		if (idMatch) { expr = _after(expr, idMatch); }
		// PRIMARY KEY
		const [ primaryKeyMatch, columns ] = (new RegExp(`^${ this.primaryKeyRe.source }`, 'i')).exec(expr) || [];
		if (primaryKeyMatch) return new this(context, constraintName.trim(), 'PRIMARY KEY', columns.split(',').map(s => s.trim()), null);
		// UNIQUE KEY
		const [ uniqueKeyMatch, _columns ] = (new RegExp(`^${ this.uniqueKeyRe.source }`, 'i')).exec(expr) || [];
		if (uniqueKeyMatch) return new this(context, constraintName.trim(), 'UNIQUE', _columns.split(',').map(s => s.trim()), null);
		// CHECK
		const [ checkMatch, _expr ] = (new RegExp(`^${ this.checkRe.source }`, 'i')).exec(expr) || [];
		if (checkMatch) return new this(context, constraintName.trim(), 'CHECK', [], _expr);
		// FOREIGN KEY
		const [ foreignKeyReMatch, localColumns, referencedDb, referencedTable, referencedColumns, referentialRules = '' ] = (new RegExp(`^${ this.foreignKeyRe.source }`, 'i')).exec(expr) || [];
		if (foreignKeyReMatch) return new this(context, constraintName.trim(), 'FOREIGN KEY', localColumns.split(',').map(s => s.trim()), {
			basename: referencedDb,
			table: referencedTable,
			columns: referencedColumns.split(',').map(s => s.trim()),
			matchRule: matchReferentialRule(referentialRules, 'MATCH'),
			updateRule: matchReferentialRule(referentialRules, 'UPDATE'),
			deleteRule: matchReferentialRule(referentialRules, 'DELETE'),
		});
    }

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json) {
		if (json.constraintName || (typeof json.type === 'string' && json.type.match(/PRIMARY[ ]+KEY|UNIQUE([ ]+KEY)?|CHECK|FOREIGN[ ]+KEY/i))) {
			return new this(context, json.constraintName, json.type.replace(/UNIQUE[ ]+KEY/i, 'UNIQUE'), json.columns, json.references || json.expr);
		}
	}

	/**
	 * @inheritdoc
	 */
	static fromColumnLevelConstraint(columnLevelConstraint, columnName) {
		return new this(
			columnLevelConstraint.CONTEXT/*Column*/.CONTEXT/*Create|AlterTable*/,
			columnLevelConstraint.CONSTRAINT_NAME,
			columnLevelConstraint.ATTRIBUTE === 'REFERENCES' ? 'FOREIGN KEY' : columnLevelConstraint.ATTRIBUTE,
			[columnName],
			columnLevelConstraint.ATTRIBUTE === 'CHECK' ? columnLevelConstraint.DETAIL.expr : columnLevelConstraint.DETAIL,
		);
	}

    /**
	 * @property RegExp
	 */
	static constraintNameRe = /(?:CONSTRAINT[ ]+(\w+[ ]+)?)?/;
	static primaryKeyRe = /PRIMARY[ ]+KEY(?:[ ]+)?\(([^\)]+)\)/;
	static uniqueKeyRe = /UNIQUE(?:[ ]+KEY)?(?:[ ]+)?\(([^\)]+)\)/;
	static checkRe = /CHECK(?:(?:[ ]+)?\(([^\)]+)\))/;
	static foreignKeyRe = /FOREIGN[ ]+KEY(?:[ ]+)?\(([^\)]+)\)(?:[ ]+)?REFERENCES[ ]+(?:(\w+)\.)?(\w+)(?:[ ]+)?\(([^\)]+)\)(?:[ ]+)?(.+)?$/;

}