
/**
 * @imports
 */
import IndependentExprInterface from '../../IndependentExprInterface.js';

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
