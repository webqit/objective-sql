
import AbstractAliasableExpr from './abstracts/AbstractAliasableExpr.js';
import Abstraction from './Abstraction.js';
import Identifier from '../Identifier.js';

export default class Table extends AbstractAliasableExpr {

	/**
	 * @property Array
	 */
	static exprTypes = [Abstraction,Identifier];
}