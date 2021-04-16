
/**
 * @imports
 */
import JoinInterface from './JoinInterface.js';
import Lexer from '@webqit/util/str/Lexer.js';
import Literal from './Literal.js';
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
		return this.table.eval(database, params).then(t => {
			t.join = {
				type: this.type, // Expected to be added by context
				condition: this.condition, 
				conditionClause: this.conditionClause
			};
			return t;
		});
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
			var clause = parse.matches[0];
			var table = parseCallback(parse.tokens[0], [Table]);
			var condition = clause.trim().toUpperCase() === 'USING' 
				? parseCallback(parse.tokens[1], [Literal])
				: parseCallback(parse.tokens[1]);
			return new this(
				table,
				condition, 
				clause
			);
		}
	}
}

/**
 * @prop object
 */
Join.clauses = [' on ', ' using ', ' ON ', ' USING ',];
