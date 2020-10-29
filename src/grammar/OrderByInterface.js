
/**
 * @imports
 */
import { ExprInterface } from '@web-native-js/subscript/src/grammar.js';

/**
 * ---------------------------
 * OrderByInterface
 * ---------------------------
 */				

const Interface = class extends ExprInterface {};
Object.defineProperty(Interface.prototype, 'jsenType', {
	get() { return 'OrderByExpression'; },
});
export default Interface;
