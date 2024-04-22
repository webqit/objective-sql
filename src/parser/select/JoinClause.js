
import Lexer from '@webqit/util/str/Lexer.js';
import AbstractAliasableExpr from './abstracts/AbstractAliasableExpr.js';
import Abstraction from './Abstraction.js';
import Identifier from './Identifier.js';
import Condition from './Condition.js';
import Assertion from './Assertion.js';

export default class JoinClause extends AbstractAliasableExpr {
	 
	/**
	 * Instance properties
	 */
	CLAUSE = '';
	CORRELATION;

	/**
	 * @constructor
	 */
	constructor(context, resource = null, clause = null) {
		super(context);
		this.RESOURCE = resource;
		this.CLAUSE = clause.replace(/\s+/, '_').toUpperCase();
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
	using(correlation) {
		this.CORRELATION = correlation;
		return this;
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() {
		return [
			this.CLAUSE?.replace(/_/, ' ').toUpperCase() || 'JOIN',
			super.stringify(),
			...[ typeof this.CORRELATION === 'string' ? `USING ${ this.CORRELATION }` : `ON ${ this.CORRELATION }` ], 
		].filter(s => s).join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
		const [ joinMatch, clause, joinSpec ] = expr.match(new RegExp(`^${ this.regex }(.*)$`, 'i')) || [];
		if (!joinMatch) return;
		const [ $table, $correlation ] = Lexer.split(joinSpec, ['ON|USING'], { useRegex:'i', preserveDelims: true });
		const instance = (await super.parse(context, $table.trim(), parseCallback)).with({ CLAUSE: clause });
		if (/^USING/i.test($correlation)) {
			instance.using($correlation.replace(/USING/i, '').trim());
		} else if ($correlation) {
			instance.on(await parseCallback(instance, $correlation.replace(/ON/i, '').trim(), [Condition,Assertion]));
		}
		return instance;
	}

	/**
	 * @property String
	 */
	static regex = '(INNER[ ]+|CROSS[ ]+|(?:LEFT|RIGHT)(?:[ ]+OUTER)?[ ]+)?JOIN';

	/**
	 * @property Array
	 */
	static exprTypes = [Abstraction,Identifier];
}
