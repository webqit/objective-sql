
/**
 * @imports
 */
import Lexer from '@webqit/util/str/Lexer.js';
import _unwrap from '@webqit/util/str/unwrap.js';
import ConditionInterface from './ConditionInterface.js';

/**
 * ---------------------------
 * Condition class
 * ---------------------------
 */				

export default class Condition extends ConditionInterface {
	

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
	eval(context = null, params = {}) {
		return this.assertion.eval(context, params) 
			? this.onTrue.eval(context, params) 
			: this.onFalse.eval(context, params);
	}

	/**
	 * @inheritdoc
	 */
	static async parse(expr, parseCallback, params = {}) {
		if (expr.match(/^if[ ]*?\(/i)) {
			var tokens = Lexer.split(_unwrap(expr.trim().substr(2).trim(), '(', ')'), [',']);
			if (tokens.length !== 3) {
				throw new Error('Malformed condition expression: ' + expr + '!');
			}
			return new this(...(await Promise.all(tokens.map(expr => parseCallback(expr.trim())))));
		}
	}
};