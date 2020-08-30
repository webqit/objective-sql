
/**
 * @imports
 */
//import ValInterface from './ValInterface.js';

/**
 * ---------------------------
 * Val class
 * ---------------------------
 */				
export default class Val {

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