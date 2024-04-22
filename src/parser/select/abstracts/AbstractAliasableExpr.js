
import Lexer from '@webqit/util/str/Lexer.js';
import Node from '../../Node.js';

export default class AbstractAliasableExpr extends Node {
	
	/**
	 * Instance properties
	 */
	EXPR;
	ALIAS;
	CLAUSED;

	/**
	 * @constructor
	 */
	constructor(context, expr) {
		super(context);
		this.EXPR = expr;
	}
	
	/**
	 * Sets the alias
	 * 
	 * @param String alias
	 * 
	 * @returns this
	 */
	as(alias, claused = true) {
		this.ALIAS = alias;
		this.CLAUSED = claused;
		return this;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() { return [this.EXPR, this.CLAUSED ? 'AS' : '', this.ALIAS].filter(s => s).join(' '); }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		// With an "AS" clause, its easy to obtain the alias...
		// E.g: SELECT first_name AS fname, 4 + 5 AS result, 5 + 5
		// Without an "AS" clause, its hard to determine if an expression is actually aliased...
		// E.g: In the statement SELECT first_name fname, 4 + 5 result, 5 + 5, (SELECT ...) alias FROM ...,
		let { tokens: [ exprSpec, alias = '' ], matches: [ separator ] } = Lexer.lex(expr, ['([\\w"]|^)([ ]+AS[ ]+|[ ]+)[A-Za-z"]'], { useRegex:'i' });
		// Note in the regex that separator will cut exprSpec's last letter (when not an enclosure "()") and alias' first letter.
		if (separator) {
			const separatorTokens = separator.replace(/[ ]+/, ' ').split(' ');
			exprSpec = `${ exprSpec }${ separatorTokens.shift() }`;
			alias = `${ separatorTokens.pop() }${ alias }`;
			separator = separatorTokens.join('');
		}
		const instance = new this(context, await parseCallback(context, exprSpec, this.exprTypes));
		instance.as(alias, !!separator);
		return instance;
	}

	/**
	 * @property Array
	 */
	static exprTypes = [];
}