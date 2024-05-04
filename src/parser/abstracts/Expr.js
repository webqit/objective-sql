
import Identifier from '../select/Identifier.js';
import CaseConstruct from '../select/case/CaseConstruct.js';
import Assertion from '../select/Assertion.js';
import Parens from '../select/Parens.js';
import Math from '../select/Math.js';
import Aggr from '../select/Aggr.js';
import Func from '../select/Func.js';
import Json from '../select/Json.js';
import Prim from '../select/Prim.js';
import PgConcat from '../select/str/PgConcat.js';
import Path from '../select/Path.js';
import Str from '../select/str/Str.js';
import Num from '../select/Num.js';

export default class Expr {

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json) { return this.Types.reduce((prev, Type) => prev || Type.fromJson(context, json), null); }
	
	/**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) { return await parseCallback(context, expr, this.Types); }

	/**
	 * @property Array
	 */
	static get Types() {
		return [
			Parens,
			CaseConstruct,
			PgConcat,
			Assertion,
			Math,
			Aggr,
			Func,
			Json,
			Str,
			Num,
			Prim,
			Path,
			Identifier,
		];
	}
}