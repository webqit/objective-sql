
import Lexer from '../../Lexer.js';
import Abstraction from '../Abstraction.js';
import Node from '../../Node.js';

export default class WhenClause extends Node {
	
	/**
	 * Instance properties
	 */
	CRITERION;
	CONSEQUENCE;

	/**
	 * Sets the criterion.
	 * 
	 * @param Any criterion
	 * 
	 * @returns this
	 */
	criterion(criterion) { return (this.build('CRITERION', [criterion], Abstraction.exprTypes), this); }

	/**
	 * Sets the consequence.
	 * 
	 * @param Any consequence
	 * 
	 * @returns this
	 */
	then_(consequence) { return this.build('CONSEQUENCE', [consequence], Abstraction.exprTypes); }
	
	/**
	 * @inheritdoc
	 */
	stringify() { return `${ this.CRITERION } THEN ${ this.CONSEQUENCE }`; }

	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		const tokens = Lexer.split(expr, [`\\s+THEN\\s+`], { useRegex: 'i' });
		if (tokens.length !== 2) return;
		const instance = new this(context);
		const [criterion, consequence] = await Promise.all(tokens.map($expr => parseCallback(instance, $expr.trim())));
		instance.criterion(criterion).then_(consequence);
		return instance;
	}
}