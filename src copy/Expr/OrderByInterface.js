
/**
 * @imports
 */
import { ExprInterface } from '@web-native-js/jsen';

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
