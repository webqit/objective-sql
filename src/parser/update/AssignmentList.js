
import { _wrapped, _unwrap } from '@webqit/util/str/index.js';
import Identifier from '../Identifier.js';
import Lexer from '../Lexer.js';
import Node from '../Node.js';

export default class AssignmentList extends Node {

    /**
	 * Instance properties
	 */
    ENTRIES = [];
    
    /**
	 * Builds the statement's ENTRIES
	 * 
	 * .set(i => i.name('col1'), 3);
	 * 
	 * @return this
	 */
    set(target_s, value_s) {
		this.ENTRIES.push([target_s, value_s]);
		return this;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() {
		return `\n\t${ this.ENTRIES.map(([target_s, value_s]) => {
			if (Array.isArray(target_s)) target_s = `(${ target_s.join(', ') })`;
			if (Array.isArray(value_s)) value_s = `(${ value_s.join(', ') })`;
			return `${ target_s } = ${ value_s }`;
		}).join(',\n\t') }`;
	}
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		const instance = new this(context);
		for (const assignmentExpr of Lexer.split(expr, [','])) {
			const [target_s, value_s] = Lexer.split(assignmentExpr, ['=']).map(s => s.trim()).filter(s => s);
			if (!value_s) return; // Abort... for this isn't the kind of expression we handle here
			if (_wrapped(target_s, '(', ')')) {
				const targets = await Promise.all(Lexer.split(_unwrap(target_s, '(', ')'), [',']).map(expr => parseCallback(instance, expr.trim(), [Identifier])));
				if (!_wrapped(value_s, '(', ')')) return; // Abort... for this isn't the kind of expression we handle here
				const values = /^\((\s+)?SELECT\s+/i.test(value_s) 
					? await parseCallback(instance, value_s) 
					: await Promise.all(Lexer.split(_unwrap(value_s, '(', ')'), [',']).map(expr => parseCallback(instance, expr.trim())));
				instance.set(targets, values);
			} else {
				const target = await parseCallback(instance, target_s);
				const value = await parseCallback(instance, value_s);
				instance.set(target, value);
			}
		}
		return instance;
	}
}