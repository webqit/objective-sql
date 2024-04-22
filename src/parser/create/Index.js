import Lexer from '@webqit/util/str/Lexer.js';
import { _unwrap } from '@webqit/util/str/index.js';
import Node from '../Node.js';

export default class Index extends Node {

	/**
	 * Instance properties
	 */
	INDEX_NAME = '';
	TYPE = '';
	COLUMNS = [];

    /**
	 * @constructor
	 */
    constructor(context, indexName, type, columns) {
        super(context);
        this.INDEX_NAME = indexName;
        this.TYPE = type;
        this.COLUMNS = columns;
    }

	/**
	 * @inheritdoc
	 */
	toJson() {
		return {
			type: this.TYPE,
			columns: this.COLUMNS,
			...(this.INDEX_NAME ? { indexName: this.INDEX_NAME } : {})
		};
	}
	
	/**
	 * @inheritdoc
	 */
	stringify() { return `${ this.TYPE }${ this.INDEX_NAME ? ` ${ this.INDEX_NAME }` : '' } (${ this.COLUMNS.join(', ') })`; }

    /**
	 * @inheritdoc
	 */
	static async parse(context, expr) {
        let [ , type, indexName = '', columns ] = (new RegExp(this.regex.source, this.regex.flags)).exec(expr) || [];
        if (!type) return;
        columns = Lexer.split(_unwrap(columns, '(', ')'), [',']).map(col => col.trim());
        return new this(context, indexName.trim(), type.toUpperCase(), columns);
    }

	/**
	 * @inheritdoc
	 */
	static fromJson(context, json) {
		if (json.indexName || (typeof json.type === 'string' && json.type.match(/INDEX|KEY|FULLTEXT/i))) {
			return new this(context, json.indexName, json.type, json.columns);
		}
	}

    /**
	 * @property RegExp
	 */
    static regex = /^((?:(?:FULLTEXT|SPATIAL)(?:[ ]+INDEX|[ ]+KEY)?)|(?:INDEX|KEY))([ ]+\w+)?(?:[ ]+)?(\([^\)]+\))/i;

    /**
     * @property Object
     */
    static attrEquivalents = {
        fulltext: 'FULLTEXT',
        index: 'INDEX',
    };
}