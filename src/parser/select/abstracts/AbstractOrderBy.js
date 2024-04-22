
import Lexer from '@webqit/util/str/Lexer.js';
import Node from '../../Node.js';

export default class AbstractOrderBy extends Node {
	
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
	stringify() { return this.CRITERIA.map(criterion => [criterion, ...criterion.FLAGS].join(' ')).join(','); }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		const [ orderByMatch, criteriaExpr ] = expr.match(new RegExp(`^${ this.regex }(.*)$`, 'i')) || [];
		if (!orderByMatch) return;
		const instance = new this(context);
		for (const criterionExpr of Lexer.split(criteriaExpr.trim(), [','])) {
			const [ , expr, sort ] = /(.+)[ ]+(ASC|DESC)$/i.exec(criterionExpr) || [ , criterionExpr ];
			instance.criterion((await parseCallback(instance, expr)).withFlag(sort));
		}
		return instance;
	}

	/**
	 * @property String
	 */
	static regex = 'ORDER[ ]+BY';
}