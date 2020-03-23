
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

const Mql = class extends Jsen {
	 
	/**
	 * @inheritdoc
	 */
	static parse(expr, Parsers, params = {}, Static = Mql) {
		if (!('mutates' in params)) {
			params.mutates = true;
		}
		if (!params.opts) {
			params.opts = {};
		}
		if (!('ci' in params.opts)) {
			params.opts.ci = true;
		}
		return super.parse(expr, Parsers, params, Static);
	}
};


export default Mql;
