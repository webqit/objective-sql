
/**
 * @imports
 */
import { IndependentExprInterface } from '@web-native-js/subscript/src/grammar.js';

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
