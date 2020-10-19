
/**
 * @imports
 */
import {
	Scope,
	Reference as _Reference,
	ExprInterface,
} from '@web-native-js/jsen';
import _each from '@onephrase/util/obj/each.js';
import _isString from '@onephrase/util/js/isString.js';
import _isEmpty from '@onephrase/util/js/isEmpty.js';
import _isUndefined from '@onephrase/util/js/isUndefined.js';
import _remove from '@onephrase/util/arr/remove.js';
import ArrowReference from '../ArrowReference.js';

/**
 * ---------------------------
 * Reference class
 * ---------------------------
 */				
export default class Reference extends _Reference {

	/**
	 * @inheritdoc
	 */
	constructor(context, name, backticks = false) {
		var isArrowReference = _isString(name) && ArrowReference.isReference(name);
		if (isArrowReference && !backticks) {
			backticks = true;
		}
		super(context, name, backticks);
		this.isArrowReference = isArrowReference;
	}
	
	/**
	 * @inheritdoc
	 */
	getEval(tempRow, params = {}) {
		// Lets find the table that contains the column
		var sourceContext = tempRow, name = this.name;
		if (!this.isContext && !this.isTableName) {
			var contexts = Reference.findContexts(tempRow, this.name);
			if (this.isFieldName) {
				_remove(contexts, '$');
			}
			if (!contexts.length) {
				//throw new Error('"' + this.stringify() + '" is unknown!');
			}
			if (this.arrowContext) {
				sourceContext = tempRow[this.arrowContext];
			} else if (!this.context) {
				if (contexts.indexOf('$') === -1 && contexts.length > 1) {
					throw new Error('"' + this.name + '" is ambiguous!');
				}
				if (contexts.length) {
					var context = contexts.reduce((_c, c) => _c === '$' ? _c : c, '');
					sourceContext = tempRow[context];
				}
			} else {
				if (name instanceof ExprInterface) {
					name = name.eval(tempRow, params);
				}
				sourceContext = this.context.eval(tempRow, params);
			}
		}
		return {
			get() {
				return Scope.create(sourceContext).get(name, params.trap);
			},
			del() {
				return Scope.create(sourceContext).del(name, params.trap);
			},
			has(prop) {
				return Scope.create(sourceContext).has(name, prop, params.trap);
			},
			set(val, initKeyword = null) {
				return Scope.create(sourceContext).set(name, val, params.trap, initKeyword);
			},
			exec(args) {
				return Scope.create(sourceContext).exec(name.toUpperCase(), args, params.trap);
			},
		};
	}
		
	/**
	 * @inheritdoc
	 */
	eval(tempRow, params = {}) {
		var val = super.eval(tempRow, params);
		// Table unknown?
		if (this.isContext && _isUndefined(val)) {
			throw new Error('Table "' + this.name + '" is unknown!');
		}
		return val;
	}
	
	/**
	 * @inheritdoc
	 */
	static findContexts(tempRow, name) {
		var contexts = [];
		// We ask from schema first
		Object.keys(tempRow).forEach(tableName => {
			if (tempRow[tableName] && name in tempRow[tableName]) {
				contexts.push(tableName);
			}
		});
		return contexts;
	}
};
