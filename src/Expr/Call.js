
/**
 * @imports
 */
import {
	Call as _Call,
	Contexts,
} from '@web-native-js/jsen';
import _isFunction from '@web-native-js/commons/js/isFunction.js';
import _isUndefined from '@web-native-js/commons/js/isUndefined.js';

/**
 * ---------------------------
 * Call class
 * ---------------------------
 */				

const Call = class extends _Call {
	 
	/**
	 * @inheritdoc
	 */
	eval(context = null, trap = {}) {
		return this.evalWithArgs(context, this.args.eval(context, trap), trap);
	}
	 
	/**
	 * @inheritdoc
	 */
	evalWithArgs(context, args, trap = {}) {
		var reference = this.reference.getEval(context, trap);
		if (!_isUndefined(reference.context) && !_isUndefined(reference.name)) {
			return Contexts.create(reference.context).exec(reference.name.toUpperCase(), args, trap);
		}
		throw new Error('"' + this + '" is undefined!');
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, Static = Call) {
		return super.parse(expr, parseCallback, Static);
	}
}

/**
 * @exports
 */
export default Call;
