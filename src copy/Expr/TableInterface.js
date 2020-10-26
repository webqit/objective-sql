
/**
 * @imports
 */
import { IndependentExprInterface } from '@web-native-js/jsen';

/**
 * ---------------------------
 * TableInterface
 * ---------------------------
 */				

const Interface = class extends IndependentExprInterface {};
Object.defineProperty(Interface.prototype, 'jsenType', {
	get() { return 'TableExpression'; },
});
export default Interface;
