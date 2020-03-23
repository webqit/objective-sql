
/**
 * @imports
 */
import {
	Lexer,
	Condition as _Condition
} from '@web-native-js/jsen';
import _unwrap from '@web-native-js/commons/str/unwrap.js';

/**
 * ---------------------------
 * Condition class
 * ---------------------------
 */				

const Condition = class extends _Condition {
	
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
	static parse(expr, parseCallback, Static = Condition) {
		if (expr.match(/^if[ ]*?\(/i)) {
			var tokens = Lexer.split(_unwrap(expr.trim().substr(2).trim(), '(', ')'), [',']);
			if (tokens.length !== 3) {
				throw new Error('Malformed condition expression: ' + expr + '!');
			}
			return new Static(...tokens.map(expr => parseCallback(expr.trim())));
		}
	}
};

/**
 * @exports
 */
export default Condition;
