
import { _after, _before, _unwrap, _toCamel } from '@webqit/util/str/index.js';
import ColumnLevelConstraint from './ColumnLevelConstraint.js';
import DataType from './DataType.js';		
import Node from '../Node.js';

export default class Column extends Node {

    /**
	 * Instance properties
	 */
	NAME = '';
	TYPE;
	CONSTRAINTS = [];

    /**
	 * @constructor
	 */
    constructor(context, name) {
        super(context);
        this.NAME = name;
    }

	/**
	 * Sets the column type,
	 * 
	 * @param DataType|Object value
	 * 
	 * @returns this
	 */
	type(value) { return this.build('TYPE', [value], DataType); }

	/**
	 * Adds a column-level constraint to the column,
	 * 
	 * @param ColumnLevelConstraint constraint
	 * 
	 * @returns this
	 */
	constraint(...constraints) { return this.build('CONSTRAINTS', constraints, ColumnLevelConstraint); }
	
	/**
	 * @inheritdoc
	 */
	toJson() {
        let json = {
            name: this.NAME,
            type: this.TYPE?.toJson(),
        };
        for (const constraint of this.CONSTRAINTS) {
            const { constraintName, attribute, detail } = constraint.toJson();
            const equivProperty = Object.keys(ColumnLevelConstraint.attrEquivalents).find(prop => ColumnLevelConstraint.attrEquivalents[prop] === attribute);
            json = { ...json, [ equivProperty ]: { constraintName, ...detail } };
        }
        return json;
    }
	
	/**
	 * @inheritdoc
	 */
	stringify() {
        // Render constraints in the order of ColumnLevelConstraint.attrEquivalents;
        let constraints = Object.values(ColumnLevelConstraint.attrEquivalents).map(attr => this.CONSTRAINTS.find(cnst => cnst.ATTRIBUTE === attr)).filter(c => c);
        if (this.params.dialect === 'mysql') { constraints = constraints.filter(c => c.ATTRIBUTE !== 'REFERENCES'); }
        return `${ this.NAME } ${ this.TYPE }${ constraints.length ? ` ${ constraints.join(' ') }` : '' }`;
    }
    
    /**
	 * @inheritdoc
	 */
	static async parse(context, expr, parseCallback) {
        let [ name ] = expr.match(/^\w+/);
        if (!name) return;
        const instance = new this(context, name);
        let $expr = expr, constraint;
        while($expr && (constraint = await parseCallback(instance, $expr, [ColumnLevelConstraint], { assert: false }))) {
            instance.constraint(constraint);
            $expr = $expr.replace(constraint.WHOLE_MATCH, '');
        }
        // Only now
        instance.type(await parseCallback(instance, $expr/* NOTE: not expr but $expr */, [DataType]));
        return instance;
    }

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json) {
		if (!json.name || !json.name.match(/[a-zA-Z]+/i)) return;
        const instance = new this(context, json.name);
        // Constraints
        for (const property in ColumnLevelConstraint.attrEquivalents) {
            if (!json[property]) continue;
            const { constraintName, ...detail } = json[property];
            const attrName = ColumnLevelConstraint.attrEquivalents[property];
            instance.constraint(ColumnLevelConstraint.fromJson(instance, { constraintName, attribute: attrName, detail }));
        }
        instance.type(DataType.fromJson(instance, json.type));
		return instance;
	}
}