
/**
 * @imports
 */
import { IndependentExprInterface } from '@web-native-js/jsen';

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
