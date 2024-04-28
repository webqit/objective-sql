import Lexer from './Lexer.js';

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
	 * @property Array
	 */
	get quoteChars() { return this.constructor.getQuoteChars(this); }

	/**
	 * @property String
	 */
	get escChar() { return this.constructor.getEscChar(this); }

	/**
	 * An Escape helper
	 * 
	 * @param String|Array string_s 
	 * 
	 * @returns String
	 */
	autoEsc(string_s) {
		const $strings = (Array.isArray(string_s) ? string_s : [string_s]).map(s => s && !/^[*\w]+$/.test(s) ? `${ this.escChar }${ s.replace(new RegExp(this.escChar, 'g'), this.escChar.repeat(2)) }${ this.escChar }` : s );
		return Array.isArray(string_s) ? $strings : $strings[0];
	}

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
		const get = () => {
			if (this[attrName] && !Array.isArray(this[attrName])) return this[attrName]; // Singleton?
			return new Type(this, ...defaultArgs);
		};
		const set = (...args) => {
			for (const arg of args) {
				if (Array.isArray(this[attrName])) this[attrName].push(arg);
				else this[attrName] = arg;
			}
		};
		// ---------
		const instance = args.length === 1 && typeof args[0] !== 'function' && Type && (args[0] instanceof Type ? args[0] : Type.fromJson(this, args[0]));
		if (instance) return set(instance);
		// ---------
		if (targetMethod) {
			const instance = get();
			set(instance);
			// Forward the function to target...
			// which is expected to recurse here for building entries in the instance
			return instance[targetMethod](...args);
		}
		// ---------
		for (let arg of args) {
			if (typeof arg === 'function') {
				const instance = get();
				arg = (arg(instance), instance);
			} else if (!(arg instanceof Node)) {
				// Attempt to cast to type
				const $arg = Type.fromJson?.(this, arg);
				if ($arg) {
					arg = $arg;
				} else {
					throw new Error(`Arguments must be of type ${ Type.name } or a JSON equivalent.`);
				}
			}
			set(arg);
		}
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
	 * @inheritdoc
	 */
	static parseIdent(context, expr) {
		const escChar = this.getEscChar(context);
		const parts = Lexer.split(expr, ['.']);
		const parses = parts.map(s => (new RegExp(`^(?:(\\*|[\\w]+)|(${ escChar })((?:\\2\\2|[^\\2])+)\\2)$`)).exec(s.trim())).filter(s => s);
		if (parses.length !== parts.length) return;
		const get = x => x?.[1] || x?.[3];
		return [this.normalizeEscChars(context, get(parses.pop())), this.normalizeEscChars(context, get(parses.pop()))];
	}

	/**
	 * @inheritdoc
	 */
	static normalizeEscChars(context, expr) {
		const escChar = this.getEscChar(context);
		return (expr || '').replace(new RegExp(escChar + escChar, 'g'), escChar);
	}
	
	/**
	 * SAttempts to parse a string into the class instance.
	 *
	 * @param Any context
	 * @param Object json
	 *
	 * @return Node
	 */
	static fromJson(context, json) {}
	
	/**
	 * Determines the proper quote characters for the active SQL dialect ascertained from context.
	 * 
	 * @param Node|AbstractClient context 
	 * 
	 * @returns Array
	 */
	static getQuoteChars(context) { return context?.params?.dialect === 'mysql' ? ['"', "'"] : ["'"]; }

	/**
	 * Determines the proper escape character for the active SQL dialect ascertained from context.
	 * 
	 * @param Node|AbstractClient context 
	 * 
	 * @returns String
	 */
	static getEscChar(context) { return context?.params?.dialect === 'mysql' ? '`' : '"'; }
}
