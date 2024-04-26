
import Lexer from './Lexer.js';
import { _merge } from '@webqit/util/obj/index.js';
import grammar from './grammar.js';
		
const cache = {};
export default class Parser {
	static grammar = grammar;

	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, grammar, params = {}) {
		if (!params.placeholdersTransformed && expr.indexOf('?') > 0) {
			expr = Lexer.split(expr, ['?'], {blocks:[]}).reduce((expr, t, i) => expr ? expr + '?' + (i - 1) + t : t, null);
			params.placeholdersTransformed = true;
		}
		params.allowCache = false;
		if (expr.length) {
			if (cache[expr] && !grammar && params.allowCache !== false) {
				var _parsed;
				if (_parsed = await this.parseOne(context, expr, cache[expr], params)) {
					return _parsed;
				}
			}
			// -----------------------------
			var _grammar = Object.values(grammar?.length ? grammar : this.grammar);
			for (var i = 0; i < _grammar.length; i ++) {
				var parsed = await this.parseOne(context, expr, _grammar[i], params);
				if (parsed) {
					//console.log('...', expr, '-->', parsed.constructor.name);
					if (!grammar && params.allowCache !== false) {
						cache[expr] = _grammar[i];
					}
					return parsed;
				}
			}
			// -----------------------------
			if (/^[\d.]$/.test(expr)) return expr;
			if (params.assert === false) {
				return;
			}
			throw new SyntaxError(expr);
		}
	}
	 
	/**
	 * @inheritdoc
	 */

	static async parseOne(context, expr, Expr, params = {}) {
		return await Expr.parse(context, expr, async (context, _expr, _grammar, _params = {}) => {
			return await this.parse(context, _expr, _grammar, _params ? _merge({}, params, _params) : params);
		});
	}
}