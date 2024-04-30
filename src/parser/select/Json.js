
/**
 * @imports
 */
import { _wrapped } from '@webqit/util/str/index.js';
import Lexer from '../Lexer.js';
import Str from './str/Str.js';

export default class Json extends Str {

	/**
	 * Instance properties
	 */
	TYPE = '';

	/**
	 * @constructor
	 */
	constructor(context, value, type, quote) {
		super(context, value, quote);
		this.TYPE = type;
	}

	/**
	 * Sets the value to an object
	 * 
	 * @param Object value
	 */
	object(value) {
		this.VALUE = JSON.stringify(value);
		this.TYPE = 'OBJECT';
	}

	/**
	 * Sets the value to an array
	 * 
	 * @param Object value
	 */
	array(value) {
		this.VALUE = JSON.stringify(value);
		this.TYPE = 'ARRAY';
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() { return `${ super.stringify() }`; }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		const braces = [['{','}'], ['[',']']], $ = {};
		const [text, quote] = this.parseText(context, expr) || [];
		if (!quote) return;
		if (!($.braces = braces.find(b => _wrapped(expr, b[0], b[1]))) || Lexer.match(expr, [' ']).length) return;
		return new this(context, text, $.braces[0] === '{' ? 'OBJECT' : 'ARRAY', quote);
	}
}