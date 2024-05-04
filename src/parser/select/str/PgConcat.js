
import Lexer from '../../Lexer.js';
import Expr from '../../abstracts/Expr.js';
import Node from '../../abstracts/Node.js';

export default class PgConcat extends Node {
	
	/**
	 * Instance properties
	 */
	STRINGS = [];

	/**
	 * @inheritdoc
	 */
	concat(...strings) { return this.build('STRINGS', strings, Expr.Types); }
	
	/**
	 * @inheritdoc
	 */
	stringify() { return this.STRINGS.join(' || '); }

	/**
	 * @inheritdoc
	 */
	toJson() { return { strings: this.STRINGS.map(str => str.toJson()), flags: this.FLAGS, }; }

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json) {
		if (!Array.isArray(json?.strings)) return;
		const instance = (new this(context)).withFlag(...(json.flags || []));
		instance.concat(...json.strings);
		return instance;
	}
	 
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		let { tokens, matches } = Lexer.lex(expr, [`||`]);
		if (!matches.length) return;
		const instance = new this(context);
		instance.concat(...(await Promise.all(tokens.map(expr => parseCallback(instance, expr.trim())))));
		return instance;
	}
}
