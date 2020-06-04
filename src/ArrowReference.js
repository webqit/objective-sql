
/**
 * @imports
 */
import Schema from './Schema.js';
import _before from '@web-native-js/commons/str/before.js';
import _after from '@web-native-js/commons/str/after.js';
import _isString from '@web-native-js/commons/js/isString.js';
import _isObject from '@web-native-js/commons/js/isObject.js';

export default class ArrowReference {
	
	/**
	 * Tells if a column is a reference.
	 *
	 * @param {String} str
	 *
	 * @return bool
	 */
	static isReference(str) {
		return str.indexOf('<-') > -1 || str.indexOf('->') > -1;
	}
	
	/**
	 * Tells if a path is an outgoing reference in direction.
	 *
	 * @param {String} reference
	 *
	 * @return bool
	 */
	static isOutgoing(reference) {
		return reference.indexOf('->') > -1 && _before(reference, '->').indexOf('<-') === -1;
	}
	
	/**
	 * Tells if a path is an incoming reference in direction.
	 *
	 * @param {String} reference
	 *
	 * @return bool
	 */
	static isIncoming(reference) {
		return reference.indexOf('<-') > -1 && _before(reference, '<-').indexOf('->') === -1;
	}
	
	/**
	 * Returns the relationshipPath in reverse direction.
	 *
	 * @param {String} reference
	 *
	 * @return string
	 */
	static reverse(reference) {
		return reference.replace(/->/g, '|->|').replace(/<-/g, '|<-|')
			.split('|').map(str => str === '->' ? '<-' : (str === '<-' ? '->' : str)).reverse().join('');
	}

	/**
	 * Gets the immediate target in a reference path.
	 * 
	 * @param {String} base 
	 * @param {String} reference 
	 * 
	 * @return {Object}
	 */
    static eval(base, reference) {
		var table1, table2;
		if (ArrowReference.isIncoming(reference)) {
			// reference === actingKey<-...
			var actingKey = _before(reference, '<-'),
				sourceTable = _after(reference, '<-');
			if (ArrowReference.isIncoming(sourceTable)) {
				// reference === actingKey<-actingKey2<-table->?...
				table2 = ArrowReference.eval('', sourceTable).a.table;
				var select = sourceTable;
			} else {
				// reference === actingKey<-table->?...
				var _sourceTable = _before(sourceTable, '->')
					select = _after(sourceTable, '->');
				if (!(table2 = Schema.tables[_sourceTable])) {
					throw new Error('[' + reference + ']: The implied table "' + _sourceTable + '" is not defined.');
				}
			}
			if (!base) {
				// --------------------------
				// Now get table1 from table2
				// --------------------------
				if (!table2.fields[actingKey] || !(table1 = table2.fields[actingKey].referencedEntity)) {
					throw new Error('[' + reference + ']: The "' + table2.name + '" table does not define the implied foreign key "' + actingKey + '".');
				}
				table1 = Schema.tables[table1.name];
			} else if (_isString(base)) {
				table1 = Schema.tables[base];
			} else if (_isObject(base)) {
				table1 = base;
			}
			return {
				a: {table: table1, actingKey: table1.primaryKey,},
				b: {table: table2, actingKey, select,},
			};
		}

		// reference === foreignKey->...
		if (_isString(base)) {
			table1 = Schema.tables[base];
		} else if (_isObject(base)) {
			table1 = base;
			base = table1.name;
		}
		// --------------------------
		// Now get table2 from table1
		// --------------------------
		var foreignKey = _before(reference, '->')
			select = _after(reference, '->');
		if (!table1.fields[foreignKey] || !(table2 = table1.fields[foreignKey].referencedEntity)) {
			throw new Error('[' + base + '->' + reference + ']: The "' + base + '" table does not define the implied foreign key "' + foreignKey + '".');
		}
		table2 = Schema.tables[table2.name];
		return {
			a: {table: table1, actingKey: foreignKey,},
			b: {table: table2, actingKey: table2.primaryKey, select,},
		};
	}
}