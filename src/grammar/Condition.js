
/**
 * @imports
 */
import {
	Condition as _Condition
} from '@webqit/subscript/src/grammar.js';
import Lexer from '@webqit/util/str/Lexer.js';
import _unwrap from '@webqit/util/str/unwrap.js';

/**
 * ---------------------------
 * Condition class
 * ---------------------------
 */				

export default class Condition extends _Condition {
	
	/**
	 * @inheritdoc
	 */
	constructor(assertion, onTrue, onFalse) {
		super();
		this.assertion = assertion;
		this.onTrue = onTrue;
		this.onFalse = onFalse;
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
		return 'IF (' + [
			this.assertion.stringify(params), 
			this.onTrue.stringify(params),
			this.onFalse.stringify(params)
		].join(', ') + ')';
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}) {
		if (expr.match(/^if[ ]*?\(/i)) {
			var tokens = Lexer.split(_unwrap(expr.trim().substr(2).trim(), '(', ')'), [',']);
			if (tokens.length !== 3) {
				throw new Error('Malformed condition expression: ' + expr + '!');
			}
			return new this(...tokens.map(expr => parseCallback(expr.trim())));
		}
	}
};