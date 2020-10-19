
/**
 * @imports
 */
import JoinInterface from './JoinInterface.js';
import Lexer from '@onephrase/util/str/Lexer.js';
import Table from './Table.js';

/**
 * ---------------------------
 * Join class
 * ---------------------------
 */				

export default class Join extends JoinInterface {
	 
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
	eval(database, params = {}) {
		var TableBase = this.table.eval(database, params);
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
	toString() {
		return this.stringify();
	}
	
	/**
	 * @inheritdoc
	 */
	stringify(params = {}) {
		return [
			this.table.stringify(params), 
			this.conditionClause, 
			this.condition.stringify(params)
		].join('');
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}) {
		var parse = Lexer.lex(expr, Join.clauses);
		if (parse.tokens.length === 2) {
			return new this(
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
