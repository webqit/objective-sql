
/**
 * @imports
 */
import {
	Assertion as _Assertion
} from '@webqit/subscript/src/grammar.js';

/**
 * @extends
 */
export default class Assertion extends _Assertion {}

/**
 * @var string
 */
Assertion.negation = 'NOT ';

/**
 * @prop array
 */
Assertion.operators = {
	and: ' and ',
	or: ' or ',
	AND: ' AND ',
	OR: ' OR ',
};