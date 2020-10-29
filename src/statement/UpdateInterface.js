
/**
 * @imports
 */
import { IndependentExprInterface } from '@web-native-js/subscript/src/grammar.js';

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
