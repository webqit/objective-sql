
/**
 * @imports
 */
import { IndependentExprInterface } from '@webqit/subscript/src/grammar.js';

/**
 * ---------------------------
 * InsertInterface
 * ---------------------------
 */				

const Interface = class extends IndependentExprInterface {};
Object.defineProperty(Interface.prototype, 'jsenType', {
	get() { return 'InsertStatement'; },
});
export default Interface;
