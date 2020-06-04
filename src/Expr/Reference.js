
/**
 * @imports
 */
import {
	Lexer,
	Reference as _Reference
} from '@web-native-js/jsen';
import _each from '@web-native-js/commons/obj/each.js';
import _isString from '@web-native-js/commons/js/isString.js';
import _isEmpty from '@web-native-js/commons/js/isEmpty.js';
import _isUndefined from '@web-native-js/commons/js/isUndefined.js';
import _remove from '@web-native-js/commons/arr/remove.js';

/**
 * ---------------------------
 * Reference class
 * ---------------------------
 */				
const Reference = class extends _Reference {

	/**
	 * @inheritdoc
	 */
	constructor(context, name, backticks = false) {
		var isArrowReference = _isString(name) && /(<-|->)/.test(name);
		if (isArrowReference && !backticks) {
			backticks = true;
		}
		super(context, name, backticks);
		this.isArrowReference = isArrowReference;
	}
	
	/**
	 * @inheritdoc
	 */
	eval(tempRow, trap = {}) {
		// Lets find the table that contains the column
		if (!this.isContext && !this.isTableName) {
			var contexts = Reference.findContexts(tempRow, this.name);
			if (this.isFieldName) {
				_remove(contexts, '$');
			}
			if (!contexts.length) {
				//throw new Error('"' + this.toString() + '" is unknown!');
			}
			if (this.arrowContext) {
				var _context = this.context;
				this.context = undefined;
				var val = super.eval(tempRow[this.arrowContext], trap);
				this.context = _context;
				return val;
			}
			if (!this.context) {
				if (contexts.indexOf('$') === -1 && contexts.length > 1) {
					throw new Error('"' + this.name + '" is ambiguous!');
				}
				if (contexts.length) {
					var context = contexts.reduce((_c, c) => _c === '$' ? _c : c, '');
					return super.eval(tempRow[context], trap);
				}
			}
		}
		var val = super.eval(tempRow, trap);
		// Table unknown?
		if (this.isContext && _isUndefined(val)) {
			//throw new Error('Table "' + this.name + '" is unknown!');
		}
		return val;
	}
	
	/**
	 * @inheritdoc
	 */
	static findContexts(tempRow, name) {
		var contexts = [];
		// We ask from schema first
		Object.keys(tempRow).forEach(tableName => {
			if (tempRow[tableName] && name in tempRow[tableName]) {
				contexts.push(tableName);
			}
		});
		return contexts;
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, params = {}, Static = Reference) {
		return super.parse(expr, parseCallback, params, Static);
	}
}

/**
 * @exports
 */
export default Reference;
