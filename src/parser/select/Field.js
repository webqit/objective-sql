
import Lexer from '../Lexer.js';
import AbstractAliasableExpr from './abstracts/AbstractAliasableExpr.js';

export default class Field extends AbstractAliasableExpr {
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		// The PG string concat syntax can really confuse our alias parser in super... so we capture that case first
		const concatSplit = Lexer.split(expr, [`||`]);
		if (concatSplit.length > 1) {
			// Alias will typically be found on the last part like this
			const [$exprSpec, claused, alias] = this.parseAlias(context, concatSplit.pop());
			// Now we restore excluded parts of expr
			const exprSpec = [...concatSplit, $exprSpec].join(' || ');
			const $node = await parseCallback(context, exprSpec, this.resourceTypes, { assert: false });
			if ($node) {
				const instance = new this(context, $node);
				instance.as(alias, claused);
				return instance;
			}
		}
		return super.parse(...arguments);
	}
}