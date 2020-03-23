
/**
 * @imports
 */
//import ValInterface from './ValInterface.js';

/**
 * ---------------------------
 * Val class
 * ---------------------------
 */				
const Val = class {

	/**
	 * @inheritdoc
	 */
	constructor(input) {
		this.input = input;
	}
	 
	/**
	 * @inheritdoc
	 */
	eval() {
		return this.input;
	}
	
	/**
	 * @inheritdoc
	 */
	toString(context = null) {
		return '?';
	}
};

/**
 * @exports
 */
export default Val;
