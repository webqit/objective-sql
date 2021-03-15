
/**
 * @imports
 */
import { IndependentExprInterface } from '@webqit/subscript/src/grammar.js';

/**
 * ---------------------------
 * UpdateInterface
 * ---------------------------
 */				

const Interface = class extends IndependentExprInterface {};
Object.defineProperty(Interface.prototype, 'jsenType', {
	get() { return 'UpdateStatement'; },
});
export default Interface;
