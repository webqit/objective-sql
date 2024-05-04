
import Lexer from '../Lexer.js';
import Identifier from './Identifier.js';
import Condition from './Condition.js';
import Assertion from './Assertion.js';
import Table from './Table.js';

export default class JoinClause extends Table {
	 
	/**
	 * Instance properties
	 */
	TYPE = '';
	CORRELATION = null;

	/**
	 * @constructor
	 */
	constructor(context, expr = null, type = null) {
		super(context, expr);
		this.TYPE = type;
	}

	/**
	 * Adds a condition
	 * 
	 * @param Array assertions
	 * 
	 * @returns this
	 */
	on(...correlations) { return this.build('CORRELATION', correlations, Condition, 'and'); }

	/**
	 * Sets the using clause
	 * 
	 * @param String correlation
	 * 
	 * @returns this
	 */
	using(correlation) { return this.build('CORRELATION', [correlation], Identifier); }

	/**
	 * @inheritdoc
	 */
	toJson() {
		return {
			type: this.TYPE,
			correlation: this.CORRELATION?.toJson(),
			...super.toJson(),
		};
	}

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json) {
		const instance = super.fromJson(context, json);
		if (!instance) return;
		if (json?.expr && json.type) instance.TYPE = json.type;
		if (json?.expr && json.correlation) instance.build('CORRELATION', [json.correlation], [Identifier,Condition]);
		return instance;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() {
		return [
			this.TYPE?.replace(/_/, ' ').toUpperCase() || 'JOIN',
			super.stringify(),
			...[ this.CORRELATION instanceof Identifier ? `USING ${ this.CORRELATION }` : `ON ${ this.CORRELATION }` ], 
		].filter(s => s).join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		const [ joinMatch, type, joinSpec ] = expr.match(new RegExp(`^${ this.regex }([\\s\\S]*)$`, 'i')) || [];
		if (!joinMatch) return;
		const { tokens: [ $table, $correlation ], matches } = Lexer.split(joinSpec, ['ON|USING'], { useRegex:'i' });
		const instance = (await super.parse(context, $table.trim(), parseCallback)).with({ TYPE: type.replace(/\s+/g, '_').toUpperCase() });
		if (/^USING$/i.test(matches[0])) {
			instance.using(await parseCallback(instance, $correlation.trim(), [Identifier]));
		} else if (/^ON$/i.test(matches[0])) {
			instance.on(await parseCallback(instance, $correlation.trim(), [Condition,Assertion]));
		}
		return instance;
	}

	/**
	 * @property String
	 */
	static regex = '(INNER\\s+|CROSS\\s+|(?:LEFT|RIGHT)(?:\\s+OUTER)?\\s+)?JOIN';
}
