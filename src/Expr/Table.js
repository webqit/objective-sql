
/**
 * @imports
 */
import {
	AbstractionInterface,
	ReferenceInterface,
	Lexer
} from '../index.js';
import _isArray from '@web-native-js/commons/js/isArray.js';
import _objFrom from '@web-native-js/commons/obj/from.js';
import SelectInterface from './SelectInterface.js';
import TableInterface from './TableInterface.js';
import UnionInterface from './UnionInterface.js';
import DerivedTableBase from '../Base/DerivedTable.js';
import TableBase from '../Base/Table.js';

/**
 * ---------------------------
 * Table class
 * ---------------------------
 */				

const Table = class extends TableInterface {
	
	/**
	 * @inheritdoc
	 */
	constructor(expr, alias, claused = false) {
		super();
		// ReferenceInterface or AbstractionInterface
		this.expr = expr;
		this.alias = alias;
		this.claused = claused;
	}
	
	/**
	 * @inheritdoc
	 */
	eval(database = null, trap = {}) {
		// Derived table???
		if (this.expr instanceof AbstractionInterface) {
			return new DerivedTableBase(database, this.expr/*ABS*/.expr/*SELECT*/, this.alias);
		}
		if (this.expr instanceof ReferenceInterface) {
			// We must eval() without context...
			if (this.expr.context) {
				var tableData = this.expr.eval(_objFrom(this.expr.context.name, database), trap);
			} else {
				this.expr.searchWithoutContext = false;
				var tableData = this.expr.eval(database, trap);
			}
			if (!_isArray(tableData)) {
				throw new Error('Table "' + this.expr.name + '" could not be initialized!');
			}
			// + this.expr.name does not have any backticka problem
			return new TableBase(tableData, this.alias || this.expr.name);
		}
	}
	
	/**
	 * @inheritdoc
	 */
	toString(context = null) {
		return [this.expr.toString(context), this.claused ? 'AS' : '', this.alias].filter(a => a).join(' ');
	}
	
	/**
	 * @inheritdoc
	 */
	static parse(expr, parseCallback, Static = Table) {
		var parse = Lexer.lex(expr, [' (as )?'], {useRegex:'i'});
		if (parse.tokens.length < 3) {
			var tableParse = parseCallback(parse.tokens[0]);
			if (!(tableParse instanceof ReferenceInterface) 
			&& !(tableParse instanceof AbstractionInterface && (tableParse.expr instanceof SelectInterface || tableParse.expr instanceof UnionInterface))) {
				throw new Error('Table expression must be either a plain reference or a (derived) query!');
			}
			return new Static(
				tableParse, 
				(parse.tokens[1] || '').trim(), 
				(parse.matches[0] || '').trim()
			);
		}
	}
	
	/**
	 * --------------
	 */
	
	/**
	 * @inheritdoc
	 */
	as(alias) {
		this.alias = alias;
		this.claused = true;
		return this;
	}
};

/**
 * @exports
 */
export default Table;
