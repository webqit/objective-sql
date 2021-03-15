
/**
 * @imports
 */
import { ExprInterface } from '@webqit/subscript/src/grammar.js';

/**
 * ---------------------------
 * JoinInterface
 * ---------------------------
 */				

const Interface = class extends ExprInterface {};
Object.defineProperty(Interface.prototype, 'jsenType', {
	get() { return 'JoinConstruct'; },
});
export default Interface;
