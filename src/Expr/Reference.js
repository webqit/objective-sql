
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
		var isPath = _isString(name) && /(<-|->)/.test(name);
		if (isPath && !backticks) {
			backticks = true;
		}
		super(context, name, backticks);
		this.isPath = isPath;
	}
	
	/**
	 * @inheritdoc
	 */
	eval(tempRow, trap = {}) {
		// Lets find the table that contains the column
		if (!this.isContext && this.searchWithoutContext !== false) {
			var contexts = Reference.findContexts(tempRow, this.name);
			if (!contexts.length) {
				throw new Error('"' + this.toString() + '" is unknown!');
			}
			if (!this.context) {
				if (contexts.indexOf('$') === -1 && contexts.length > 1) {
					throw new Error('"' + this.name + '" is ambiguous!');
				}
				if (contexts.length) {
					return this.parseCallback(contexts.reduce((_c, c) => _c === '$' ? _c : c, '') + '.' + this.toString()/*full toString()*/).eval(tempRow, trap);
				}
			}
		}
		var val = super.eval(tempRow, trap);
		// Table unknown?
		if (this.isContext && _isUndefined(val)) {
			throw new Error('Table "' + this.name + '" is unknown!');
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
			if (tableName !== '#') {
				// + this.name does not have any backticka problem
				if (tempRow['#'] && tempRow['#'][tableName] && !_isEmpty(tempRow['#'][tableName].fields)) {
					var row = tempRow['#'][tableName].fields;
				} else {
					var row = tempRow[tableName];
				}
				if (!_isUndefined(row[name])) {
					contexts.push(tableName);
				}
			}
		});
		return contexts;
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, Static = Reference) {
		var instance = super.parse(expr, parseCallback, Static);
		if (instance) {
			instance.parseCallback = parseCallback;
			return instance;
		}
	}
}

/**
 * @exports
 */
export default Reference;
