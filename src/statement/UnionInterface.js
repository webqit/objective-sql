
/**
 * @imports
 */
import { ExprInterface } from '@web-native-js/subscript/src/grammar.js';

/**
 * ---------------------------
 * UnionInterface
 * ---------------------------
 */				

const Interface = class extends ExprInterface {};
Object.defineProperty(Interface.prototype, 'jsenType', {
	get() { return 'UnionConstruct'; },
});
export default Interface;
