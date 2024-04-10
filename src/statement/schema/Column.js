
import Lexer from '@webqit/util/str/Lexer.js';
import { _after, _before, _unwrap, _toCamel } from '@webqit/util/str/index.js';
import DataType from './DataType.js';
import ColumnInterface from './ColumnInterface.js';
import ColumnLevelConstraint from './ColumnLevelConstraint.js';

/**
 * ---------------------------
 * Column class
 * ---------------------------
 */				

export default class Column extends ColumnInterface {

    /**
	 * @constructor
	 */
    constructor(name, type, constraints, params = {}) {
        super();
        this.name = name;
        this.type = type;
        this.constraints = constraints;
        this.params = params;
    }

	/**
	 * @inheritdoc
	 */
	toString() { return this.stringify(); }
	
	/**
	 * @inheritdoc
	 */
	stringify() { return `${ this.name } ${ this.type }${ this.constraints.length ? ` ${ this.constraints.join(' ') }` : '' }`; }
	
	/**
	 * @inheritdoc
	 */
	toJson() {
        let schema = {
            name: this.name,
            type: this.type?.toJson(),
        };
        for (const constraint of this.constraints) {
            const [ attrName, value ] = constraint.toJson();
            schema = { ...schema, [ attrName ]: value };
        }
        return schema;
    }

	/**
	 * @inheritdoc
	 */
	static fromJson(json, params = {}) {
		if (!json.name || !json.name.match(/[a-zA-Z]+/i)) throw new Error(`Could not assertain column name or column name invalid.`);
        // Constraints
        const constraints = [];
        for (const attrName in ColumnLevelConstraint.attrEquivalents) {
            if (!json[attrName]) continue;
            constraints.push(ColumnLevelConstraint.fromJson(attrName, json[attrName], params));
        }
        // Instance
		return new this(json.name, DataType.fromJson(json.type, params), constraints, params);
	}
    
    /**
	 * @inheritdoc
	 */
	static async parse(expr, parseCallback, params = {}) {
        let [ name ] = expr.match(/^\w+/);
        let $expr = expr, constraint, constraints = [];
        while($expr && (constraint = await parseCallback($expr, [ColumnLevelConstraint], {...params, assert: false}))) {
            constraints.push(constraint);
            $expr = $expr.replace(constraint.params.wholeMatch, '');
        }
        return new this(name, await DataType.parse(expr, parseCallback, params), constraints, params);
    }
}