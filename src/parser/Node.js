
export default class Node {
	
	/**
	 * Instance properties
	 */
	CONTEXT;
	FLAGS = [];

	/**
	 * Constructor
	 */
	constructor(context) {
		this.CONTEXT = context;
	}
	
	/**
	 * Recursively accesses @params.
	 * 
	 * @returns String
	 */
	get params() { return this.CONTEXT?.params || {}; }

	/**
	 * Helper for adding additional attributes to the instance.
	 * 
	 * @params Object meta
	 * 
	 * @return this
	 */
	with(meta) {
		for (const attr in meta) { this[attr] = meta[attr]; }
		return this;
	}

	/**
	 * Helper for adding flags to the instance.
	 * 
	 * @params Array flags
	 * 
	 * @return this
	 */
	withFlag(...flags) {
		this.FLAGS.push(...flags.filter(f => f).map(flag => flag.toUpperCase()));
		return this;
	}

	/**
	 * Helper for inspecting flags on the instance.
	 * 
	 * @params String flag
	 * 
	 * @return Bool
	 */
	hasFlag(flag) { return this.FLAGS.includes(flag.toUpperCase()); }

	/**
	 * Helper for adding clauses to the instance.
	 * 
	 * @params String LIST
	 * @params Array args
	 * @params Node Type
	 * @params String targetMethod
	 * @params Array defaultArgs
	 * 
	 * @return this
	 */
	build(attrName, args, Type, targetMethod, defaultArgs = []) {
		const getInstance = () => {
			if (this[attrName] && !Array.isArray(this[attrName])) return this[attrName]; // Singleton?
			return new Type(this, ...defaultArgs);
		};
		for (let arg of args) {
			if (typeof arg === 'function') {
				if (Type) {
					const instance = getInstance();
					if (targetMethod) {
						// Forward the function to target...
						// which is expected to recurse here for building entries in the instance
						instance[targetMethod](arg);
					}
					arg = instance;
				} else {
					arg = arg(); throw new Error(`TODO`);
				}
			} else if (Type && !(arg instanceof Type)) {
				// Attempt to cast to type
				const $arg = Type.fromJson?.(this, arg);
				if ($arg) {
					arg = $arg;
				} else if (targetMethod) {
					// Forward the input to target...
					// which is expected to recurse here for building entries in the instance
					const instance = getInstance();
					instance[targetMethod](arg);
					arg = instance;
				} else {
					throw new Error(`Arguments must be of type ${ Type.name } or a JSON equivalent.`);
				}
			} else if (!(arg instanceof Node)) {
				// TODO: Attempt casting
				throw new Error(`Arguments must be of type Node or a JSON equivalent.`);
			}
			if (Array.isArray(this[attrName])) this[attrName].push(arg);
			else this[attrName] = arg;
		}
	}

	/**
	 * @property String
	 */
	get escChar() { return this.params.dialect === 'mysql' ? '`' : '"'; }

	/**
	 * An Escape helper
	 * 
	 * @param String|Array string_s 
	 * 
	 * @returns String
	 */
	autoEsc(string_s) {
		const $strings = (Array.isArray(string_s) ? string_s : [string_s]).map(s => s && !/^\w+$/.test(s) ? `${this.escChar}${s}${this.escChar}` : s );
		return Array.isArray(string_s) ? $strings : $strings[0];
	}

	/**
	 * Cast the instance to a plain object.
	 * 
	 * @returns Object
	 */
	toJson() { return {}; }

	/**
	 * Serializes the instance.
	 * 
	 * @returns String
	 */
	toString() { return this.stringify(); }
	
	/**
	 * SAttempts to parse a string into the class instance.
	 *
	 * @param Any context
	 * @param String expr
	 * @param Function parseCallback
	 *
	 * @return Node
	 */
	static async parse(context, expr, parseCallback = null) {}
	
	/**
	 * SAttempts to parse a string into the class instance.
	 *
	 * @param Any context
	 * @param Object json
	 *
	 * @return Node
	 */
	static fromJson(context, json) {}
}
