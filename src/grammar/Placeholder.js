
/**
 * @imports
 */
import _isNumeric from '@webqit/util/js/isNumeric.js';
import PlaceholderInterface from './PlaceholderInterface.js';

/**
 * ---------------------------
 * Reference class
 * ---------------------------
 */				
export default class Placeholder extends PlaceholderInterface {

	/**
	 * @inheritdoc
	 */
	constructor(name, notation) {
		super();
		this.name = _isNumeric(name) ? parseInt(name) : name;
		this.notation = notation;
	}
		
	/**
	 * @inheritdoc
	 */
	eval(tempRow, params = {}) {
		if (typeof this.name === 'number') {
			if (!params.vars) {
				throw new Error('Annonymous placeholders require a "params.vars" array to be resolved.');
			}
			return params.vars[this.name];
		}
		if (!params.vars) {
			throw new Error('Named placeholders require a "params.vars" object to be resolved.');
		}
		return params.vars[this.name];
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
		return this.notation === '?' ? '?' : this.notation + this.name;
	}
	
	/**
	 * @inheritdoc
	 */
	static async parse(expr, parseCallback, params = {}) {
		if (expr.startsWith('?') || expr.startsWith(':')) {
			return new this(expr.substr(1), expr.substr(0, 1));
		}
	}
}
