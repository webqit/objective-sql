
/**
 * @imports
 */
import { IndependentExprInterface } from '@web-native-js/jsen';

/**
 * ---------------------------
 * SelectInterface
 * ---------------------------
 */				

const Interface = class extends IndependentExprInterface {};
Object.defineProperty(Interface.prototype, 'jsenType', {
	get() { return 'SelectStatement'; },
});
export default Interface;
