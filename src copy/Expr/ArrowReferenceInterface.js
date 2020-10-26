
/**
 * @imports
 */
import { ExprInterface } from '@web-native-js/jsen';

/**
 * ---------------------------
 * AggrInterface
 * ---------------------------
 */				

const Interface = class extends ExprInterface {};
Object.defineProperty(Interface.prototype, 'jsenType', {
	get() { return 'ArrowReferenceExpression'; },
});
export default Interface;
