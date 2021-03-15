
/**
 * @imports
 */
import { IndependentExprInterface } from '@webqit/subscript/src/grammar.js';

/**
 * ---------------------------
 * DeleteInterface
 * ---------------------------
 */				

const Interface = class extends IndependentExprInterface {};
Object.defineProperty(Interface.prototype, 'jsenType', {
	get() { return 'DeleteStatement'; },
});
export default Interface;
