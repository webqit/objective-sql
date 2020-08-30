
/**
 * @imports
 */
import Jsen from '@web-native-js/jsen';

/**
 * ---------------------------
 * Mql (base) class
 *
 * TODO:
 *		SELECT *
 *		SELECT ... FROM (SELECT ...)
 *		PREPARED STATEMENTS PLACEHOLDERS
 * ---------------------------
 */				

export default class Rql extends Jsen {
	 
	/**
	 * @inheritdoc
	 */
	static parse(expr, Parsers, params = {}) {
		if (!('mutates' in params)) {
			params.mutates = true;
		}
		if (!params.opts) {
			params.opts = {};
		}
		if (!('ci' in params.opts)) {
			params.opts.ci = true;
		}
		params.allowCache = false;
		return super.parse(expr, Parsers, params);
	}
};