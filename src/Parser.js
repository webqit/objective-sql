
/**
 * @imports
 */
import Lexer from '@webqit/util/str/Lexer.js';
import _merge from '@webqit/util/obj/merge.js';
import _isEmpty from '@webqit/util/js/isEmpty.js';
import _remove from '@webqit/util/arr/remove.js';
import _isArray from '@webqit/util/js/isArray.js';
import ReferenceInterface from './grammar/ReferenceInterface.js';
import CallInterface from './grammar/CallInterface.js';
import IndependentExprInterface from './IndependentExprInterface.js';
import SyntaxError from './SyntaxError.js';
import grammar from './grammar.js';

/**
 * ---------------------------
 * Parser class
 * ---------------------------
 */				
const cache = {};
export default class Parser {
	static grammar = grammar;

	/**
	 * @inheritdoc
	 */
	static async parse(expr, grammar, params = {}) {
		if (!('mutates' in params)) {
			params.mutates = true;
		}
		if (!params.placeholdersTransformed && expr.indexOf('?') > 0) {
			expr = Lexer.split(expr, ['?'], {blocks:[]}).reduce((expr, t, i) => expr ? expr + '?' + (i - 1) + t : t, null);
			params.placeholdersTransformed = true;
		}
		if (!params.opts) { params.opts = {}; }
		if (!('ci' in params.opts)) { params.opts.ci = true; }
		params.allowCache = false;
		if (expr.length) {
			if (cache[expr] && !grammar && params.allowCache !== false) {
				var _parsed;
				if (_parsed = await this.parseOne(expr, cache[expr], params)) {
					return _parsed;
				}
			}
			// -----------------------------
			var _grammar = Object.values(grammar || this.grammar);
			for (var i = 0; i < _grammar.length; i ++) {
				var parsed = await this.parseOne(expr, _grammar[i], params);
				if (parsed) {
					if (!grammar && params.allowCache !== false) {
						cache[expr] = _grammar[i];
					}
					return parsed;
				}
			}
			// -----------------------------
			if (params.assert === false) {
				return;
			}
			throw new SyntaxError(expr);
		}
	}
	 
	/**
	 * @inheritdoc
	 */

	static async parseOne(expr, Expr, params = {}) {
		// From this point forward, all vars is within current scope
		var meta = createMeta();
		var parsed = await Expr.parse(expr, async (_expr, _grammar, _params = {}) => {
			var subStmt = await this.parse(_expr, _grammar, _params ? _merge({}, params, _params) : params);
			if (subStmt instanceof ReferenceInterface) {
				var hasCallHead, _context = subStmt;
				while(_context = _context.context) {
					if (_context instanceof CallInterface) {
						hasCallHead = true;
					}
				}
				subStmt.role = _params.role;
				if (!hasCallHead && _params.role !== 'CONTEXT') {
					var type = _params.role === 'ASSIGNMENT_SPECIFIER' ? 'writes' 
						: (_params.role === 'DELETION_SPECIFIER' ? 'deletes' 
							: (_params.role === 'CALL_SPECIFIER' ? '_calls' : 'reads'));
					meta[type].push(subStmt);
				}
			} else if (subStmt instanceof CallInterface) {
				meta.calls.push(subStmt);
			}
			if (subStmt) {
				Object.keys(subStmt.meta).forEach(type => {
					if (type === 'deep') return;
					subStmt.meta[type].forEach(_var => meta[type].push(_var));
				});
				Object.keys(subStmt.meta.deep).forEach(type => {
					if (!meta.deep[type]) {
						meta.deep[type] = [];
					}
					subStmt.meta.deep[type].forEach(_var => meta.deep[type].push(_var));
				});
			}
			return subStmt;
		}, params);

		// Add/remove vars to scope
		if (parsed) {
			if (parsed instanceof IndependentExprInterface) {
				parsed.meta = createMeta();
			} else {
				parsed.meta = meta;
			}
			if (parsed instanceof CallInterface) {
				if (parsed.reference.context && !(parsed.reference.context instanceof CallInterface)) {
					parsed.meta.reads.push(parsed.reference.context);
				}
			}
			if (_isArray(params.explain)) {
				params.explain.push(expr + ' >>------------->> ' + parsed.jsenType);
			}
		}
		return parsed;
	}
};

function createMeta() {
	return {reads: [], writes: [], deletes: [], calls: [], _calls: [], deep: {},};
};