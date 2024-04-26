
import Lexer from '../../Lexer.js';
import WhenClause from './WhenClause.js';
import Node from '../../Node.js';

export default class CaseConstruct extends Node {
	
	/**
	 * Instance properties
	 */
	GIVEN_VALUE;
	WHEN_CLAUSES = [];
	ELSE_CLAUSE;

	/**
	 * Sets a given value for the cases.
	 * 
	 * @param Any givenValue
	 * 
	 * @returns this
	 */
	given(givenValue) { return this.build('GIVEN_VALUE', [givenValue]); }

	/**
	 * Adds a "when" expression
	 * 
	 * @param Any whenExpr
	 * 
	 * @returns WhenClause
	 */
	when(whenExpr) {
		this.build('WHEN_CLAUSES', [whenExpr], WhenClause, 'criterion');
		return this.WHEN_CLAUSES[this.WHEN_CLAUSES.length - 1];
	}

	/**
	 * Adds an ELSE clause to the cases.
	 * 
	 * @param Any elseClause
	 * 
	 * @returns this
	 */
	else(elseClause) { return this.build('ELSE_CLAUSE', [elseClause]); }
	
	/**
	 * @inheritdoc
	 */
	stringify() {
		const sql = [];
		if (this.GIVEN_VALUE) sql.push(this.GIVEN_VALUE);
		sql.push(`WHEN ${ this.WHEN_CLAUSES.join(' WHEN ') }`);
		if (this.ELSE_CLAUSE) sql.push('ELSE', this.ELSE_CLAUSE);
		return `CASE ${ sql.join(' ') } END${ this.params.dialect === 'mysql' ? ' CASE' : '' }`;
	}

	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		const [caseMatch,caseConstruct] = expr.match(/^CASE\s+([\s\S]*)\s+END(\s+CASE)?$/i) || [];
		if (!caseMatch) return;
		const { tokens: [ caseValue, ...assertions ], matches: clauses } = Lexer.lex(caseConstruct, ['WHEN','ELSE'], { useRegex: 'i' });
		const instance = new this(context);
		// Has given value?
		if (caseValue.trim()) instance.given(await parseCallback(instance, caseValue.trim()));
		// On to the cases
		for (const clause of clauses) {
			const assertStmt = assertions.shift();
			if (/ELSE/i.test(clause)) {
				instance.else(await parseCallback(instance, assertStmt.trim()));
			} else if (/WHEN/i.test(clause)) {
				instance.when(await parseCallback(instance, assertStmt.trim(), [WhenClause]));
			} else {
				throw new Error(`Can't have multiple "${ clause }" clauses in a CASE construct.`);
			}
		}
		return instance;
	}
}