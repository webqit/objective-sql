
import Lexer from '@webqit/util/str/Lexer.js';
import AbstractOrderBy from './abstracts/AbstractOrderBy.js';

export default class OrderByClause extends AbstractOrderBy {

	/**
	 * Sets the WITH_ROLLUP flag.
	 * 
	 * @returns this
	 */
	withRollup() { return this.withFlag('WITH_ROLLUP'); }
	
	/**
	 * @inheritdoc
	 */
	stringify() { return ['ORDER BY', super.stringify(), ...this.FLAGS.map(s => s.replace(/_/g, ' '))].join(' '); }

	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		const { tokens: [$expr], matches } = Lexer.lex(expr, ['[ ]+WITH[ ]+ROLLUP$'], { useRegex: 'i' });
		const instance = await super.parse(context, $expr.trim(), parseCallback);
		if (!instance) return;
		if (matches.length) instance.withFlag('WITH_ROLLUP');
		return instance;
	}
}