
/**
 * @imports
 */
import _Parser from '@web-native-js/subscript';
import Lexer from '@onephrase/util/str/Lexer.js';

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

export default class Parser extends _Parser {
	 
	/**
	 * @inheritdoc
	 */
	static parse(expr, Parsers, params = {}) {
		if (!('mutates' in params)) {
			params.mutates = true;
		}
		if (!params.placeholdersTransformed && expr.indexOf('?') > 0) {
			expr = Lexer.split(expr, ['?'], {blocks:[]}).reduce((expr, t, i) => expr ? expr + '?' + (i - 1) + t : t, null);
			params.placeholdersTransformed = true;
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