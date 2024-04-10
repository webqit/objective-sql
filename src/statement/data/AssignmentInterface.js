
/**
 * @imports
 */
import ExprInterface from '../../ExprInterface.js';

/**
 * ---------------------------
 * AssignmentExpression
 * ---------------------------
 */				

const Interface = class extends ExprInterface {};
Object.defineProperty(Interface.prototype, 'jsenType', {
	get() { return 'AssignmentExpression'; },
});
export default Interface;
