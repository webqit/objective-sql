
import Lexer from '../Lexer.js';
import StatementNode from '../StatementNode.js';
import Path from './Path.js';
import JoinClause from './JoinClause.js';
import GroupByClause from './GroupByClause.js';
import OrderByClause from './OrderByClause.js';
import WindowClause from './window/WindowClause.js';
import Condition from './Condition.js';
import Assertion from './Assertion.js';
import Field from './Field.js';
import Table from './Table.js';
import Aggr from './Aggr.js';

export default class Select extends StatementNode {
	
	/**
	 * Instance properties
	 */
	SELECT_LIST = [];
	FROM_LIST = [];
	JOIN_LIST = [];
	WHERE_CLAUSE = null;
	GROUP_BY_CLAUSE = null;
	HAVING_CLAUSE = null;
	WINDOW_CLAUSE = null;
	ORDER_BY_CLAUSE = null;
	OFFSET_CLAUSE = null;
	LIMIT_CLAUSE = null;

	/**
	 * @properties Array
	 */
	AGGRS = [];
	PATHS = [];

    /**
	 * Catalog certain nodes
	 * 
	 * @param Node node
	 * 
	 * @returns Void
	 */
    connectedNodeCallback(node) {
		if (node instanceof Aggr) this.AGGRS.push(node);
		if (node instanceof Path) this.PATHS.push(node);
	}

	/**
	 * Builds the statement's SELECT_LIST
	 * 
	 * .select(
	 * 		'col1',
	 * 		f1 => f1.name('col2').as('alias1'),
	 * 		f2 => f1.func('CONCAT_WS', i => i.name(...) ),
	 * 		f3 => f1.aggr('SUM', 'col1'),
	 * 		f3 => f1.aggr(aggr => aggr.name('RANK').over( w => w.existing('w1') ) ),
	 * 		f3 => f1.aggr(aggr => aggr.name('RANK').over( w => w.partitionBy( p => p.name('col1') ) ) ),
	 * 		f3 => f1.math('+', 'col1', 'col2'),
	 * 		f3 => f1.math('/', i => i.name('col1'), i => i.func('AVG', ... ) ),
	 * 		f3 => f1.case( c => c.given(2), c => c.when(2).then(4), c => c.else(4) ).as('alias3'),
	 * 		f4 => f1.query(
	 * 			q => q.select().from()...
	 * 		).as('alias4'),
	 * );
	 * 
	 * @return Void
	 */
	select(...fields) { return this.build('SELECT_LIST', fields, Field); }

	/**
	 * Builds the statement's FROM_LIST
	 * 
	 * .from(
	 * 		t1 => t1.name('tbl1').as('alias'),
	 * 		t2 => t2.name('tbl2')
	 * );
	 * 
	 * @return Void
	 */
	from(...tables) { return this.build('FROM_LIST', tables, Table); }

	/**
	 * Builds the statement's JOIN_LIST
	 * 
	 * .join(
	 * 		j1 => j1.name('tbl1').using('col').as('alias1'),
	 * 		j2 => j2.query(
	 * 			q => q.select().from()
	 * 		).on(
	 * 			c1 => c1.equals('a', 'b')
	 * 		).as('alias2')
	 * );
	 * 
	 * @return Void
	 */
	join(...tables) { return this.build('JOIN_LIST', tables, JoinClause); }

	/**
	 * A variant of the join()
	 * 
	 * @param  ...Any tables 
	 * 
	 * @returns Void
	 */
	leftJoin(...tables) { return this.build('JOIN_LIST', tables, JoinClause, null, [null, 'LEFT_JOIN']); }

	/**
	 * A variant of the join()
	 * 
	 * @param  ...Any tables 
	 * 
	 * @returns Void
	 */
	rightJoin(...tables) { return this.build('JOIN_LIST', tables, JoinClause, null, [null, 'RIGHT_JOIN']); }

	/**
	 * A variant of the join()
	 * 
	 * @param  ...Any tables 
	 * 
	 * @returns Void
	 */
	innerJoin(...tables) { return this.build('JOIN_LIST', tables, JoinClause, null, [null, 'INNER_JOIN']); }

	/**
	 * A variant of the join()
	 * 
	 * @param  ...Any tables 
	 * 
	 * @returns Void
	 */
	crossJoin(...tables) { return this.build('JOIN_LIST', tables, JoinClause, null, [null, 'CROSS_JOIN']); }

	/**
	 * Builds the statement's WHERE_CLAUSE
	 * 
	 * .where(
	 * 		c1 => c1.equals('a', 'b').and(
	 * 			c2 => c2.isNull('a')
	 * 		),
	 * 		c3 => c3.lessThan(2, 4)
	 * );
	 * 
	 * @return Void
	 */
	where(...wheres) { return this.build('WHERE_CLAUSE', wheres, Condition, 'and'); }

	/**
	 * Builds the statement's GROUP_BY_CLAUSE
	 * 
	 * .groupBy(
	 * 		'col1',
	 * 		by => by.name('col2'),
	 * 		by => by.func('CONCAT_WS', ... ),
	 * 		by => by.case(c => c.given(2), c => c.when(2).then(4), c => c.else(4) ),
	 * ).withRollup()
	 * 
	 * @return Void
	 */
	groupBy(...groupBys) { return (this.build('GROUP_BY_CLAUSE', groupBys, GroupByClause, 'criterion'), this.GROUP_BY_CLAUSE/* for: .withRollup() */); }

	/**
	 * Builds the statement's HAVING_CLAUSE
	 * 
	 * .having(
	 * 		c1 => c1.equals('a', 'b').and(
	 * 			c2 => c2.isNull('a')
	 * 		),
	 * 		c3 => c3.lessThan(2, 4)
	 * );
	 * 
	 * @return Void
	 */
	having(...wheres) { return this.build('HAVING_CLAUSE', wheres, Condition, 'and'); }

	/**
	 * Builds the statement's WINDOW_CLAUSE
	 * 
	 * .window(
	 * 		w1 => w1.name('w1').partitionBy(
	 * 			by => by.name(columnName)
	 * 		).orderBy(
	 * 			by => by.name(columnName)
	 * 		),
	 * 		w2 => w2.name('w2').extends('w1')
	 * )
	 * 
	 * @return Void
	 */
	window(...windows) { return this.build('WINDOW_CLAUSE', windows, WindowClause, 'define'); }

	/**
	 * Builds the statement's ORDER_BY_CLAUSE
	 * 
	 * .orderBy(
	 * 		'col1',
	 * 		by => by.name('col2').withFlag('ASC'),
	 * 		by => by.func('CONCAT_WS', ... ).withFlag('ASC'),
	 * 		by => by.case(c => c.given(), c => c.when(...).then(...), c.else() ).ASC(),
	 * ).withRollup()
	 * 
	 * @return this
	 */
	orderBy(...orderBys) { return (this.build('ORDER_BY_CLAUSE', orderBys, OrderByClause, 'criterion'), this.ORDER_BY_CLAUSE/* for: .withRollup() */); }

	/**
	 * Sets the statement's OFFSET_CLAUSE
	 * 
	 * .offset(3);
	 * 
	 * @return string
	 */
	offset(offset) {
		if (typeof offset !== 'number') throw new Error(`Offsets must be of type number.`);
		this.OFFSET_CLAUSE = offset;
	}

	/**
	 * Sets the statement's LIMIT_CLAUSE
	 * 
	 * .limit([3, 5]);
	 * 
	 * @return string
	 */
	limit(...limit) {
		if (!limit.every(l => typeof l === 'number')) throw new Error(`Limits must be of type number.`);
		this.LIMIT_CLAUSE = limit;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify(params = {}) {
		const sql = ['SELECT'];
		if (this.FLAGS.length) sql.push(this.FLAGS.map(s => s.replace(/_/g, ' ')));
		sql.push(this.SELECT_LIST.join(', '));
		sql.push('FROM', this.FROM_LIST.join(', '));
		if (this.JOIN_LIST.length) sql.push(...this.JOIN_LIST);
		if (this.WHERE_CLAUSE) sql.push('WHERE', this.WHERE_CLAUSE);
		if (this.GROUP_BY_CLAUSE) sql.push(this.GROUP_BY_CLAUSE);
		if (this.HAVING_CLAUSE) sql.push('HAVING', this.HAVING_CLAUSE);
		if (this.WINDOW_CLAUSE) sql.push(this.WINDOW_CLAUSE);
		if (this.ORDER_BY_CLAUSE) sql.push(this.ORDER_BY_CLAUSE);
		if (this.OFFSET_CLAUSE) sql.push('OFFSET', this.OFFSET_CLAUSE);
		if (this.LIMIT_CLAUSE) sql.push('LIMIT', (Array.isArray(this.LIMIT_CLAUSE) ? this.LIMIT_CLAUSE : [this.LIMIT_CLAUSE]).join(','));
		return sql.join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		const [ match, withUac, allOrDistinct, body ] = /^SELECT\s+(?:(WITH\s+UAC)\s+)?(ALL|DISTINCT)?([\s\S]+)$/i.exec(expr) || [];
		if (!match) return;
		const instance = new this(context);
		if (withUac) instance.withFlag('WITH_UAC');
		if (allOrDistinct) instance.withFlag(allOrDistinct);
		const clausesMap = { from: { backtest: '^(?!.*\\s+DISTINCT\\s+$)', test: 'FROM' }, join:JoinClause, where:'WHERE', groupBy:GroupByClause, having:'HAVING', window:WindowClause, orderBy:OrderByClause, offset:'OFFSET', limit:'LIMIT' };
		const { tokens: [ fieldsSpec, ...tokens ], matches: clauses } = Lexer.lex(body.trim(), Object.values(clausesMap).map(x => typeof x === 'string' || x.test ? x : x.regex), { useRegex: 'i' });
		// SELECT_LIST
		for (const fieldExpr of Lexer.split(fieldsSpec, [','])) {
			const field = await parseCallback(instance, fieldExpr.trim(), [Field]);
			instance.select(field);
		}
		// CLAUSES
		for (const clause of clauses) {
			const clauseRe = new RegExp(clause.replace(/\s+/g, ''), 'i'), clauseKey = Object.keys(clausesMap).find(key => clauseRe.test(key));
			// FROM_LIST
			if (clauseKey === 'from') {
				for (const tblExpr of Lexer.split(tokens.shift(), [','])) {
					const node = await parseCallback(instance, tblExpr.trim(), [Table]);
					instance.from(node);
				}
			}
			// WHERE_CLAUSE|HAVING_CLAUSE
			else if (['where', 'having'].includes(clauseKey)) {
				const node = await parseCallback(instance, tokens.shift().trim(), [Condition,Assertion]);
				instance[clauseKey](node);
			}
			// OFFSET|LIMIT
			else if (['offset', 'limit'].includes(clauseKey)) {
				const args = tokens.shift().split(',').map(s => parseInt(s.trim()));
				instance[clauseKey](...args);
			}
			// JOIN|GROUP_BY|WINDOW|ORDER_BY
			else {
				const node = await parseCallback(instance, `${ clause } ${ tokens.shift().trim() }`, [clausesMap[clauseKey]]);
				instance[clauseKey](node);
			}
		}
		return instance;
	}
}