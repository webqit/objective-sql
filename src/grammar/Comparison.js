
/**
 * @imports
 */
import {
	Comparison as _Comparison
} from '@webqit/subscript/src/grammar.js';


/**
 * @extends
 */
export default class Comparison extends _Comparison {};

/**
 * @prop array
 */
Comparison.operators = {
	relative: {
		lesserThan: '<',
		greaterThan: '>',
		lesserThanOrEqualsTo: '<=',
		greaterThanOrEqualsTo: '>=',
	},
	partial: {
		any: 'any',
		in: 'in',
		like: 'like',
	},
	exact: {
		notEqualsTo: '<>',
		// must be after all ocurrencies of "="
		is: '=',
	},
};