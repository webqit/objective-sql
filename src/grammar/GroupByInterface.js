
/**
 * @imports
 */
import { ExprInterface } from '@webqit/subscript/src/grammar.js';

/**
 * ---------------------------
 * GroupByInterface
 * ---------------------------
 */				

const Interface = class extends ExprInterface {};
Object.defineProperty(Interface.prototype, 'jsenType', {
	get() { return 'GroupByExpression'; },
});
export default Interface;
