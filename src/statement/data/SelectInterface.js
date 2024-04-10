
/**
 * @imports
 */
import IndependentExprInterface from '../../IndependentExprInterface.js';

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
