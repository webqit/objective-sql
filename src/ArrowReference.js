
/**
 * @imports
 */
import Schema from './Schema.js';
import _before from '@web-native-js/commons/str/before.js';
import _after from '@web-native-js/commons/str/after.js';

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
	 * @param {String} tableName 
	 * @param {String} reference 
	 * 
	 * @return {Object}
	 */
    static eval(tableName, reference) {
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
			if (!tableName) {
				// --------------------------
				// Now get table1 from table2
				// --------------------------
				if (!table2.fields[actingKey] || !(table1 = table2.fields[actingKey].referencedEntity)) {
					throw new Error('[' + reference + ']: The "' + table2.name + '" table does not define the implied foreign key "' + actingKey + '".');
				}
				table1 = Schema.tables[table1.name];
			} else {
				table1 = Schema.tables[tableName];
			}
			return {
				a: {table: table1, actingKey: table1.primaryKey,},
				b: {table: table2, actingKey, select,},
			};
		}
		// reference === foreignKey->...
		table1 = Schema.tables[tableName];
		// --------------------------
		// Now get table2 from table1
		// --------------------------
		var foreignKey = _before(reference, '->')
			select = _after(reference, '->');
		if (!table1.fields[foreignKey] || !(table2 = table1.fields[foreignKey].referencedEntity)) {
			throw new Error('[' + tableName + '->' + reference + ']: The "' + tableName + '" table does not define the implied foreign key "' + foreignKey + '".');
		}
		table2 = Schema.tables[table2.name];
		return {
			a: {table: table1, actingKey: foreignKey,},
			b: {table: table2, actingKey: table2.primaryKey, select,},
		};
	}
}