
import { _unwrap } from '@webqit/util/str/index.js';
import Lexer from '../Lexer.js';
import StatementNode from '../StatementNode.js';
import AssignmentList from '../update/AssignmentList.js';
import OnConflictClause from './OnConflictClause.js';
import Identifier from '../Identifier.js';
import Select from '../select/Select.js';
import Table from '../select/Table.js';

export default class Insert extends StatementNode {
	 
	/**
	 * Instance properties
	 */
	TABLE = null;
	COLUMNS_LIST = [];
	VALUES_LIST = [];
	SET_CLAUSE = null;
	SELECT_CLAUSE = null;
	ON_CONFLICT_CLAUSE = null;

	/**
	 * Builds the statement's TABLE
	 * 
	 * .into(
	 * 		t1 => t1.name('tbl1').as('alias'),
	 * );
	 * 
	 * @return Void
	 */
	into(table) { return this.build('TABLE', [table], Table); }

	/**
	 * Builds the statement's COLUMNS_LIST
	 * 
	 * .columns('col1', 'col2');
	 * 
	 * @return Void
	 */
	columns(...columns) { return this.build('COLUMNS_LIST', columns, Identifier); }

	/**
	 * Builds the statement's VALUES_LIST
	 * 
	 * .values(100, 22);
	 * 
	 * @return Void
	 */
	values(...values) { return this.VALUES_LIST.push(values); }

	/**
	 * Builds the statement's SET_CLAUSE
	 * 
	 * .set('col2', 22);
	 * .set(
	 * 		list => list.set('col2', 22)
	 * );
	 * 
	 * @return Void
	 */
	set(...assignments) { return this.build('SET_CLAUSE', assignments, AssignmentList, 'set'); }

	/**
	 * Builds the statement's SELECT_CLAUSE
	 * 
	 * .select(...);
	 * 
	 * @return Void
	 */
	select(query) { return this.build('SELECT_CLAUSE', [query], Select); }

	/**
	 * Builds the statement's ON_CONFLICT_CLAUSE
	 * 
	 * .onConflict(
	 * 		c => c.set('col1', 100),
	 * 		c => c.set('col2', 22)
	 * 		c => c.where(
	 * 			x => x.equals(...)
	 * 		)
	 * );
	 * 
	 * @return Void
	 */
	onConflict(...onConflictSpecs) { return this.build('ON_CONFLICT_CLAUSE', onConflictSpecs, OnConflictClause); }
	
	/**
	 * @inheritdoc
	 */
	stringify() {
		const sql = ['INSERT'];
		if (this.FLAGS.length) sql.push(this.FLAGS.map(s => s.replace(/_/g, ' ')));
		sql.push('INTO', this.TABLE);
		if (this.SET_CLAUSE) sql.push('SET', this.SET_CLAUSE);
		else {
			if (this.COLUMNS_LIST.length) sql.push(`(${ this.COLUMNS_LIST.join(', ') })`);
			if (this.SELECT_CLAUSE) sql.push(this.SELECT_CLAUSE);
			else sql.push('VALUES', `\n\t(${ this.VALUES_LIST.map(row => row.join(', ')).join(`),\n\t(`) })`);
		}
		if (this.ON_CONFLICT_CLAUSE) sql.push(this.ON_CONFLICT_CLAUSE);
		return sql.join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		const [insertMatch, withUac, mysqlIgnore, body] = expr.match(new RegExp(`^${ this.regex }([\\s\\S]*)$`, 'i')) || [];
		if (!insertMatch) return;
		const { tokens: [ tableSpec, payloadSpec, onConflictSpec ], matches: [insertType, onConflictClause] } = Lexer.lex(body.trim(), ['(VALUES|VALUE|SET|SELECT)', 'ON\\s+(DUPLICATE\\s+KEY|CONFLICT)'], { useRegex:'i' });
		const instance = new this(context);
		if (withUac) instance.withFlag('WITH_UAC');
		if (mysqlIgnore) instance.withFlag(mysqlIgnore);
		if (/^SET$/i.test(insertType)) {
			// INSERT ... SET
			instance.into(await parseCallback(instance, tableSpec, [Table]));
			instance.set(await parseCallback(instance, payloadSpec.trim(), [AssignmentList]));
		} else {
			const tableColumnSplit = Lexer.split(tableSpec, []);
			instance.into(await parseCallback(instance, tableColumnSplit.shift().trim(), [Table]));
			if (tableColumnSplit.length) {
				const columns = await Promise.all(Lexer.split(_unwrap(tableColumnSplit.shift().trim(), '(', ')'), [',']).map(c => parseCallback(instance, c.trim(), [Identifier])));
				instance.columns(...columns);
			}
			if (/^SELECT$/i.test(insertType)) {
				// INSERT ... SELECT
				instance.select(await parseCallback(instance, `SELECT ${ payloadSpec }`));
			} else {
				// INSERT ... VALUES|VALUE
				for (const rowPayload of Lexer.split(payloadSpec, [','])) {
					const rowPayloadArray = await Promise.all(Lexer.split(_unwrap(rowPayload.trim(), '(', ')'), [',']).map(valueExpr => parseCallback(instance, valueExpr.trim())));
					instance.values(rowPayloadArray);
				}
			}
		}
		if (onConflictClause) { instance.onConflict(await parseCallback(instance, `${ onConflictClause } ${ onConflictSpec }`, [OnConflictClause])); }
		return instance;
	}

	/**
	 * @property String
	 */
	static regex = 'INSERT(\\s+WITH\\s+UAC)?(?:\\s+(IGNORE))?(?:\\s+INTO)?';
}