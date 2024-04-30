
import grammar from './grammar.js';
		
export default class Parser {

	/**
	 * @property Object
	 */
	static grammar = grammar;

	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, grammar, params = {}) {
		if (!expr?.length) return;
		const $grammar = grammar?.length ? grammar : this.grammar;
		for (const Node of $grammar) {
			const node = await this.parseOne(context, expr, Node, params);
			if (!node) continue;
			if (params.log) console.log('.................', expr, '.................>', node.constructor.name);
			return node;
		}
		if (params.assert === false) return;
		throw new SyntaxError(expr);
	}
	 
	/**
	 * @inheritdoc
	 */
	static async parseOne(context, expr, Node, params = {}) {
		return await Node.parse(context, expr, async ($context, $expr, $grammar, $params = {}) => {
			return await this.parse($context, $expr, $grammar, { ...params, ...$params });
		});
	}
}