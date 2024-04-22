
import Lexer from '@webqit/util/str/Lexer.js';
import AbstractAliasableExpr from './abstracts/AbstractAliasableExpr.js';

export default class Field extends AbstractAliasableExpr {
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		if (/^CASE/i.test(expr)) {
			const { tokens: [ , alias ], matches } = Lexer.lex(expr, [`^CASE[ ]+(.*)[ ]+END([ ]+CASE)?`], { useRegex: 'ig' }) || {};
			const $node = await parseCallback(context, matches[0], this.resourceTypes, { assert: false });
			if (!$node) return;
			const instance = new this(context, $node);
			if (/^AS[ ]+/i.test(alias.trim())) instance.as(alias.replace(/AS[ ]+/, '').trim(), true);
			instance.as(alias.trim(), false);
			return instance;
		}
		return super.parse(...arguments);
	}
}