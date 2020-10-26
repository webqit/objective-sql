
/**
 * @imports
 */
import {
	Scope,
	Reference as _Reference,
} from '@web-native-js/jsen';
import _isArray from '@onephrase/util/js/isArray.js';

/**
 * ---------------------------
 * Reference class
 * ---------------------------
 */				
export default class Reference extends _Reference {
		
	/**
	 * @inheritdoc
	 */
	stringify(params = {}) {
		if (this.interpreted && params.interpreted) {
			if (_isArray(this.interpreted)) {
				return this.interpreted.map(ref => ref.stringify(params)).join(', ');
			}
			return this.interpreted.stringify(params);
		}
		// -----------
		return super.stringify(params);
	}
	
	/**
	 * @inheritdoc
	 */
	getEval(tempRow, params = {}) {
		// ------------
		// For those calling getEval() directly
		if (this.interpreted) {
			if (_isArray(this.interpreted)) {
				return this.interpreted.reduce((map, ref) => {
					map[ref.name] = ref.getEval(tempRow, params);
					return map;
				}, {});
			}
			return this.interpreted.getEval(tempRow, params);
		}
		// -----------
		// Lets find the table that contains the column
		var sourceContext = tempRow, name = this.name;
		if (this.context) {
			sourceContext = this.context.eval(tempRow, params);
		} else if (!(this.role === 'CONTEXT' || this.role === 'CALL_SPECIFIER')) {
			if (!tempRow.$) {
				throw new Error('"' + this + '" is undefined!');
			}
			sourceContext = tempRow.$;
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
		if (this.interpreted) {
			if (_isArray(this.interpreted)) {
				return this.interpreted.map(ref => ref.eval(tempRow, params))
			}
			return this.interpreted.eval(tempRow, params);
		}
		return this.getEval(tempRow, params).get();
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, ...args) {
		return super.parse(expr, ...args);
	}
};
