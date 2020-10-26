
/**
 * @imports
 */
import { ExprInterface } from '@web-native-js/jsen';

/**
 * ---------------------------
 * JoinInterface
 * ---------------------------
 */				

const Interface = class extends ExprInterface {};
Object.defineProperty(Interface.prototype, 'jsenType', {
	get() { return 'Placeholder'; },
});
export default Interface;
