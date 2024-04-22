
import Lexer from '@webqit/util/str/Lexer.js';
import Node from '../../Node.js';

export default class AbstractGroupBy extends Node {
	
	/**
	 * Instance properties
	 */
	CRITERIA = [];

	/**
	 * Adds a criterion.
	 * 
	 * @param Array ...args
	 * 
	 * @returns this
	 */
	criterion(...args) { return this.build('CRITERIA', args); }

	/**
	 * @inheritdoc
	 */
	stringify() { return this.CRITERIA.map(criterion => criterion.stringify()).join(','); }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		const [ groupByMatch, criteriaExpr ] = expr.match(new RegExp(`^${ this.regex }(.*)$`, 'i')) || [];
		if (!groupByMatch) return;
		const instance = new this(context);
		for (const criterionExpr of Lexer.split(criteriaExpr.trim(), [','])) {
			instance.criterion(await parseCallback(instance, criterionExpr));
		}
		return instance;
	}

	/**
	 * @property String
	 */
	static regex = 'GROUP[ ]+BY';
}