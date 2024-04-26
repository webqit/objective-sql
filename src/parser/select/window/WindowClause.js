
import Lexer from '../../Lexer.js';
import Window from './WindowSpec.js';
import Node from '../../Node.js';

export default class WindowClause extends Node {
	
	/**
	 * Instance properties
	 */
	WINDOWS_LIST = [];

	/**
	 * Adds a window spec.
	 * 
	 * @param Array windows
	 * 
	 * @returns this
	 */
	define(...windows) { return this.build('WINDOWS_LIST', windows, Window); }

	
	/**
	 * @inheritdoc
	 */
	stringify() { return `WINDOW ${ this.WINDOWS_LIST.join(',') }`; }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		const [ windowMatch, windowSpec ] = expr.match(new RegExp(`^${ this.regex }([\\s\\S]*)$`, 'i')) || [];
		if (!windowMatch) return;
		const instance = new this(context);
		for (const spec of Lexer.split(windowSpec, [','])) {
			instance.define(await parseCallback(instance, spec.trim(), [Window]));
		}
		return instance;
	}

	/**
	 * @property String
	 */
	static regex = 'WINDOW';
}