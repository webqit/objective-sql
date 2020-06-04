
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
	getName() {
		return this.table.getName();
	}	

	/**
	 * @inheritdoc
	 */
	getAlias() {
		return this.table.getAlias();
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
	static parse(expr, parseCallback, params = {}, Static = Join) {
		var parse = Lexer.lex(expr, Join.clauses);
		if (parse.tokens.length === 2) {
			return new Static(
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
Join.clauses = [' on ', ' using ', ' ON ', ' USING ',];

/**
 * @exports
 */
export default Join;
