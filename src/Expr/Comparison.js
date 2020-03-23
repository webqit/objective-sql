
/**
 * @imports
 */
import {
	Comparison
} from '@web-native-js/jsen';

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

/**
 * @exports
 */
export default Comparison;
