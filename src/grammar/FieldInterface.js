
/**
 * @imports
 */
import { ExprInterface } from '@web-native-js/subscript/src/grammar.js';

/**
 * ---------------------------
 * FieldInterface
 * ---------------------------
 */				

const Interface = class extends ExprInterface {};
Object.defineProperty(Interface.prototype, 'jsenType', {
	get() { return 'FieldExpression'; },
});
export default Interface;
