
/**
 * @imports
 */
import {
	Condition as _Condition
} from '@web-native-js/jsen';
import Lexer from '@web-native-js/commons/str/Lexer.js';
import _unwrap from '@web-native-js/commons/str/unwrap.js';

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
	toString(context = null) {
		return 'IF (' + [
			this.assertion.toString(context), 
			this.onTrue.toString(context),
			this.onFalse.toString(context)
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