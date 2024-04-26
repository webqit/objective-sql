import Node from '../Node.js';

export default class ColumnLevelConstraint extends Node {

    /**
	 * Instance properties
	 */
	CONSTRAINT_NAME = '';
	ATTRIBUTE = '';
	DETAIL = {};
	WHOLE_MATCH = '';

    /**
	 * @constructor
	 */
    constructor(context, constraintName, attribute, detail, wholeMatch = '') {
        super(context);
        this.CONSTRAINT_NAME = constraintName;
        this.ATTRIBUTE = attribute;
        this.DETAIL = detail;
        this.WHOLE_MATCH = wholeMatch;
    }

	/**
	 * @property String
	 */
	get BASENAME() { return this.CONTEXT/*Column*/.CONTEXT/*Create|AlterTable*/.BASENAME; }
	
	/**
	 * @inheritdoc
	 */
	stringify() {
        let sql = `${ this.CONSTRAINT_NAME ? `CONSTRAINT ${ this.autoEsc(this.CONSTRAINT_NAME) } ` : '' }${ ['IDENTITY', 'EXPRESSION'].includes(this.ATTRIBUTE) ? 'GENERATED' : this.ATTRIBUTE }`;
		if (this.ATTRIBUTE === 'REFERENCES') {
			const basename = this.DETAIL.basename || this.BASENAME;
			sql += ` ${ basename ? `${ basename }.` : `` }${ this.DETAIL.table } (${ this.DETAIL.columns.join(',') })`;
			if (this.DETAIL.matchRule) { sql += ` MATCH ${ this.DETAIL.matchRule }`; }
			if (this.DETAIL.updateRule) { sql += ` ON UPDATE ${ serializeReferentialRule(this.DETAIL.updateRule) }`; }
			if (this.DETAIL.deleteRule) { sql += ` ON DELETE ${ serializeReferentialRule(this.DETAIL.deleteRule) }`; }
		}
		if (this.ATTRIBUTE === 'DEFAULT') {
			sql += (this.DETAIL.expr ? ` (${ this.DETAIL.expr })` : ` ${ this.DETAIL.value }`);
		} else if (['IDENTITY', 'EXPRESSION'].includes(this.ATTRIBUTE)) {
			sql += ` ${ this.DETAIL.always ? 'ALWAYS' : 'BY DEFAULT' }`;
			if (this.ATTRIBUTE === 'IDENTITY') {
				sql += ` AS IDENTITY`;
			} else if (this.DETAIL.expr) {
				// The AS clause could be unavailable when in an alter column statement (pg): ALTER [ COLUMN ] column_name { SET GENERATED { ALWAYS | BY DEFAULT } | SET sequence_option | RESTART [ [ WITH ] restart ] } [...]
				sql += ` AS (${ this.DETAIL.expr }) STORED`;
			}
		} else if (this.ATTRIBUTE === 'CHECK') {
			sql += ` (${ this.DETAIL.expr })`;
		}
		return sql;
	}

	/**
	 * @inheritdoc
	 */
	toJson() { return { constraintName: this.CONSTRAINT_NAME, attribute: this.ATTRIBUTE, detail: this.DETAIL }; }

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json) {
		if (!Object.values(this.attrEquivalents).includes(json.attribute)) return;
		return new this(context, json.constraintName, json.attribute, json.detail);
	}

    /**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		const regex = constraintName => new RegExp(`${ this.constraintNameRe.source }${ this[ constraintName ].source }`, 'i');
		// PRIMARY KEY
		const [ primaryKeyMatch, constraintName0 = '' ] = regex('primaryKeyRe').exec(expr) || [];
		if (primaryKeyMatch) return new this(context, constraintName0.trim(), 'PRIMARY KEY', {}, primaryKeyMatch);
		// UNIQUE KEY
		const [ uniqueKeyMatch, constraintName2 = '' ] = regex('uniqueKeyRe').exec(expr) || [];
		if (uniqueKeyMatch) return new this(context, constraintName2.trim(), 'UNIQUE', {}, uniqueKeyMatch);
		// CHECK
		const [ checkMatch, constraintName3 = '', _expr ] = regex('checkRe').exec(expr) || [];
		if (checkMatch) return new this(context, constraintName3.trim(), 'CHECK', { expr: _expr }, checkMatch);
		// REFERENCES
		const [ referencesMatch, constraintName1 = '', referencedDb, referencedTable, referencedColumns, referentialRules = '' ] = regex('referencesRe').exec(expr) || [];
		if (referencesMatch) return new this(context, constraintName1.trim(), 'REFERENCES', {
			basename: referencedDb,
			table: referencedTable,
			columns: referencedColumns.split(',').map(s => s.trim()),
			matchRule: matchReferentialRule(referentialRules, 'MATCH'),
			updateRule: matchReferentialRule(referentialRules, 'UPDATE'),
			deleteRule: matchReferentialRule(referentialRules, 'DELETE'),
		}, referencesMatch);
		// IDENTITY
		const [ identityMatch, constraintName4a = '', generationFn ] = regex('identityRe').exec(expr) || [];
		if (identityMatch) return new this(context, constraintName4a.trim(), 'IDENTITY', { always: /^ALWAYS$/i.test(generationFn) }, identityMatch);
		// EXPRESSION
		const [ expressionMatch, constraintName4b = '', altGenerationFn, $$expr ] = regex('expressionRe').exec(expr) || [];
		if (expressionMatch) return new this(context, constraintName4b.trim(), 'EXPRESSION', { always: $$expr || /^ALWAYS$/i.test(altGenerationFn) ? true : false, expr: $$expr }, expressionMatch);
		// DEFAULT; Must appear after "identity" and "expression" for correct parsing of the keyword "DEFAULT"
		const [ defaultMatch, constraintName5 = '', literal, $expr ] = regex('defaultRe').exec(expr) || [];
		if (defaultMatch) return new this(context, constraintName5.trim(), 'DEFAULT', literal ? { value: literal } : { expr: $expr }, defaultMatch);
		// OTHER; Would have been fine as first, but interfares with CHECK(col is NOT NULL)
		const [ otherMatch, constraintName6 = '', attribute ] = regex('otherRe').exec(expr) || [];
		if (otherMatch) return new this(context, constraintName6.trim(), attribute.replace(/\s+/g, ' ').toUpperCase(), {}, otherMatch);
	}

    /**
	 * @property RegExp
	 */
	static constraintNameRe = /(?:CONSTRAINT\s+(\w+\s+)?)?/;
	static otherRe = /(AUTO_INCREMENT|NOT\s+NULL)/;
	static primaryKeyRe = /PRIMARY\s+KEY/;
	static uniqueKeyRe = /UNIQUE(?:\s+KEY)?/;
	static checkRe = /CHECK(?:(?:\s+)?\(([^\)]+)\))/;
	static referencesRe = /REFERENCES\s+(?:(\w+)\.)?(\w+)(?:\s+)?\(([^\)]+)\)(?:\s+)?([\s\S]+)?$/;
	static identityRe = /GENERATED\s+(ALWAYS|BY\s+DEFAULT)\s+AS[ ]IDENTITY/;
	static expressionRe = /GENERATED\s+(?:(ALWAYS|BY\s+DEFAULT)$|ALWAYS\s+AS\s+\(([^\)]+)\)(?:\s+STORED)?)?/;
	static defaultRe = /DEFAULT(?:\s+(\w+)|(?:\s+)?\(([^\)]+)\))?/;

    /**
     * @property Object
	 * 
	 * this order makes serialized output make more sense given we're looping over these somewhere in code
     */
    static attrEquivalents = {
        notNull: 'NOT NULL',
        primaryKey: 'PRIMARY KEY',
        uniqueKey: 'UNIQUE',
        check: 'CHECK',
        references: 'REFERENCES',
        identity: 'IDENTITY',
        expression: 'EXPRESSION',
        autoIncrement: 'AUTO_INCREMENT',
        default: 'DEFAULT', // Must appear after "identity" and "expression" for correct parsing of the keyword "DEFAULT"
    };
}

export const serializeReferentialRule = rule => typeof rule === 'object' && rule ? `${ rule.rule } (${ rule.columns.join(',') })` : rule;

export const matchReferentialRule = (str, type) => {
	if (type === 'MATCH') return str.match(/MATCH\s+(\w+)/i)?.[1];
	const referentialActionRe = /(NO\s+ACTION|RESTRICT|CASCADE|(SET\s+NULL|SET\s+DEFAULT)(?:\s+\(([^\)]+)\))?)/;
	const [ , keyword1, keyword2, keyword2Columns ] = str.match(new RegExp(`ON\\s+${ type }\\s+${ referentialActionRe.source }`, 'i')) || [];
	return keyword2 ? (!keyword2Columns ? keyword2 : { rule: keyword2, columns: keyword2Columns.split(',').map(s => s.trim()) }) : keyword1;
};