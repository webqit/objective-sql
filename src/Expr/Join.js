
/**
 * @imports
 */
import JoinInterface from './JoinInterface.js';
import {Lexer} from '../index.js';
import Table from './Table.js';

/**
 * ---------------------------
 * Join class
 * ---------------------------
 */				

const Join = class extends JoinInterface {
	 
	/**
	 * @inheritdoc
	 */
	constructor(table, condition, conditionClause) {
		super();
		this.table = table;
		this.condition = condition;
		this.conditionClause = conditionClause;
	}
	 
	/**
	 * @inheritdoc
	 */
	eval(database, trap = {}) {
		var TableBase = this.table.eval(database, trap);
		TableBase.join = {
			type: this.type, // Expected to be added by context
			condition: this.condition, 
			conditionClause: this.conditionClause
		};
		return TableBase;
	}
	
	/**
	 * @inheritdoc
	 */
	toString(context = null) {
		return [
			this.table.toString(context), 
			this.conditionClause, 
			this.condition.toString(context)
		].join('');
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, params = {}, cntxt = null) {
		var parse = Lexer.lex(expr, Join.clauses);
		if (parse.tokens.length === 2) {
			return new /*static*/Join(
				parseCallback(parse.tokens[0], [Table]), 
				parseCallback(parse.tokens[1]), 
				parse.matches[0]
			);
		}
	}
};

/**
 * @prop object
 */
Join.clauses = [' ON ', ' USING '];

/**
 * @exports
 */
export default Join;
