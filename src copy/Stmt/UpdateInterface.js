
/**
 * @imports
 */
import { IndependentExprInterface } from '@web-native-js/jsen';

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
