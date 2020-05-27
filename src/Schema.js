
/**
 * @imports
 */
import _isObject from '@web-native-js/commons/js/isObject.js';
import _each from '@web-native-js/commons/obj/each.js';

const Schema = {

    /**
     * Table definitions.
     * 
     * @var {Object}
     */
    tables: {},

    /**
     * Adds a table definition.
     * 
     * @param {String} tableName
     * @param {Object} tableDefinition
     * 
     * @return void
     */
    define(tableName, tableDefinition) {
        if (!_isObject(tableDefinition)) {
            throw new Error('Table definition must be an object.');
        }
        if (tableDefinition.name && tableDefinition.name !== tableName) {
            throw new Error('Table name, if really necessary, must be the same with the given definition identifier.');
        }
        if (!_isObject(tableDefinition.fields)) {
            throw new Error('Table must have a valid "fields" list.');
        }
        _each(tableDefinition.fields, (fieldName, fieldDefinition) => {
            if (!_isObject(fieldDefinition)) {
                throw new Error('Invalid field definition: "' + fieldName + '" at "' + tableName + '".');
            }
            if (fieldDefinition.referencedEntity
                && !(_isObject(fieldDefinition.referencedEntity) && fieldDefinition.referencedEntity.name)) {
                throw new Error('Invalid foreign key definition: "' + fieldName + '" at "' + tableName + '".');
            }
        });
        if (!tableDefinition.name) {
            tableDefinition.name = tableName;
        }
        this.tables[tableName] = tableDefinition;
    },

    /**
     * Deletes a table definition.
     * 
     * @param {String} tableName
     * 
     * @return void
     */
    drop(tableName) {
        if (!this.tables[tableName]) {
            throw new Error('Table "' + tableName + '" has not been defined.');
        }
        delete this.tables[tableName];
    },
};

/**
 * @exports
 */
export default Schema;