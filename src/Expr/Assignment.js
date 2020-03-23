
/**
 * @imports
 */
import {
	Assignment as _Assignment
} from '@web-native-js/jsen';
import Reference from './Reference.js';

/**
 * ---------------------------
 * Assignment class
 * ---------------------------
 */				
const Assignment = class extends _Assignment {
	
	/**
	 * @inheritdoc
	 */
	eval(tempRow, trap = {}) {
		// Lets find the table that contains the column
		if (!this.isContext && this.searchWithoutContext !== false) {
			var contexts = Reference.findContexts(tempRow, this.reference.name);
			if (!contexts.length) {
				throw new Error('"' + this.toString() + '" is unknown!');
			}
			if (!this.reference.context) {
				if (contexts.indexOf('$') === -1 && contexts.length > 1) {
					throw new Error('"' + this.reference.name + '" is ambiguous!');
				}
				if (contexts.length) {
					return this.parseCallback(contexts[0] + '.' + this.toString()/*full toString()*/, [this.Static], {mutates: true}).eval(tempRow, trap);
				}
			}
		}
		return super.eval(tempRow, trap);
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, Static = Assignment) {
		var instance = super.parse(expr, parseCallback, Static);
		if (instance) {
			instance.parseCallback = parseCallback;
			instance.Static = Static;
			return instance;
		}
	}
}

/**
 * @exports
 */
export default Assignment;
