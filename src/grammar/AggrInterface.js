
/**
 * @imports
 */
import { ExprInterface } from '@web-native-js/subscript/src/grammar.js';

/**
 * ---------------------------
 * AggrInterface
 * ---------------------------
 */				

const Interface = class extends ExprInterface {};
Object.defineProperty(Interface.prototype, 'jsenType', {
	get() { return 'AggregateExpression'; },
});
export default Interface;
