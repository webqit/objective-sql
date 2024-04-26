
/**
 * @imports
 */
import { _unwrap, _wrapped } from '@webqit/util/str/index.js';
import Lexer from '../Lexer.js';
import Node from '../Node.js';

/**
 * ---------------------------
 * Object utils
 * ---------------------------
 */				

export default class Json extends Node {
	/**
	 * Instance properties
	 */
	CONTENT;
	TYPE;

	/**
	 * @constructor
	 */
	constructor(context, content, type) {
		super(context);
		this.CONTENT = content;
		this.TYPE = type;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() { return `${ this.CONTENT }`; }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
		if (/^(TRUE|FALSE|NULL)$/i.test(expr)) { return new this(context, expr, /^NULL$/i.test(expr) ? 'NULL' : 'BOOL'); }
		const braces = [['{','}'], ['[',']']], $ = {};
		if (!($.braces = braces.find(b => _wrapped(expr, b[0], b[1]))) || Lexer.match(expr, [' ']).length) return;
		return new this(context, expr, $.braces[0] === '{' ? 'OBJECT' : 'ARRAY');
	}
}