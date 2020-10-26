
/**
 * imports
 */
import _Factory from '../Base/_Factory.js';
import _isBoolean from '@onephrase/util/js/isBoolean.js';
import _isObject from '@onephrase/util/js/isObject.js';
import _isEmpty from '@onephrase/util/js/isEmpty.js';
import _arrFrom from '@onephrase/util/arr/from.js';
import _each from '@onephrase/util/obj/each.js';

/**
 * Requires the following tables: uac, uac_token (optional), account
 * Requires a USER object: {id, lineage, parent, privileges,}
 */
export default class Query {
	
	/**
	 * Creates the UAC logic that sets the value of each field conditionally.
	 *
	 * @param object                    USER
	 * @param string                    tableName
	 * @param bool                      byRow
	 *
	 * @return object
	 */
	constructor(USER, tableName, byRow) {
		var tableNameSplit = tableName.split('.');
		var tableName = tableNameSplit.pop(),
            databaseName = tableNameSplit[0] || 'default',
            SCHEMAS = _Factory.schema[databaseName];
        this.USER = USER || {
            id: 0,
            parent: 0,
            lineage: '0',
            privileges: [],
        };
        // ---------------
        // MAIN QUERY
        // ---------------
		this.table = SCHEMAS[tableName];
        this.alias = 'MAIN';
        this.select = [];
        this.where = [];
        // ---------------
        // RULES
        // ---------------
        // JOIN: Table-wide rules most-specific to the guest
        if (SCHEMAS.uac) {
            this.EXPLICIT_TABLE_ACCESS_QUERY = {
                query: Query.getExplicitRulesQuery(this.USER, this.table.name),
                alias: 'EXPLICIT_TABLE_ACCESS',
                on: ['EXPLICIT_TABLE_ACCESS.table_row = 0'],
            };
        }
        if (byRow) {
            if (SCHEMAS.uac) {
                // JOIN: Row-wide rules most-specific to the guest
                this.EXPLICIT_ROW_ACCESS_QUERY = {
                    query: Query.getExplicitRulesQuery(this.USER, this.table.name),
                    alias: 'EXPLICIT_ROW_ACCESS',
                    on: ['EXPLICIT_ROW_ACCESS.table_row = ' + this.alias + '.' + this.table.primaryKey],
                };
            }
            // ---------------
            // RIGHTS
            // ---------------
            // JOIN: The guest's organic rights towards the owner
            if (this.table.attributionKey && SCHEMAS.account) {
                var ownerGuestRelationshipQuery = Query.getOwnerGuestRelationshipQuery(this.USER, false/* groupConcat */);
                this.AUTHOR_USER_RELATIONSHIP_QUERY = {
                    query: ownerGuestRelationshipQuery,                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
                    alias: 'AUTHOR_USER_RELATIONSHIP',
                    on: ['AUTHOR_USER_RELATIONSHIP.' + ownerGuestRelationshipQuery.table.primaryKey + ' = ' + this.alias + '.' + this.table.attributionKey],
                };
            }
        }
        // ---------------
        // APPLY
        // ---------------
        // The UAC table control
        this.where.push(this.deriveEntityAccess('view') + ' <> 0');
    }
    
    /**
     * --------------------------------------------------
     * RELATED TABLES
     * --------------------------------------------------
     */
    
	/**
	 * Makes the Query that finds the winning descreet access rules
	 * for the given access type, for the current user OR the closest ancestor on this table (or, table row).
     *
     *  Each row has the following schema:
     * 
     *  table_name: ...,
     *  table_row: ...,
     *  target: 1/3/7,
     *  uac: {
     *      read: 0,
     *      write: 0,
     *  },
     *  fields: {
     *      fname: {
     *          uac: {
     *              read: 0,
     *              write: 0,
     *          }
     *      }
     *  },
     *
	 * @return object
	 */
	static getExplicitRulesQuery(USER, tableName) {
		var tableNameSplit = tableName.split('.');
		var tableName = tableNameSplit.pop(),
            databaseName = tableNameSplit[0] || 'default',
            SCHEMAS = _Factory.schema[databaseName];
		var targetInLineageQuery = 'FIND_IN_SET(target, "' + USER.lineage.replace('/', ',') + '")';
        return {
            table: SCHEMAS.uac,
            select: ['*', targetInLineageQuery + ' AS `lineage.target`'],
            where: [
                'table_name = ' + tableName,
                'target = ' + USER.id + ' OR ' + targetInLineageQuery,
            ],
            orderBy: '`lineage.target` DESC',
            limit: 1,
            toString() {
                return 'SELECT ' + this.select.join(', ') 
                + ' FROM ' + this.table.name 
                + ' WHERE ' + this.where.join(' AND ') 
                + ' ORDER BY ' + this.orderBy 
                + ' LIMIT ' + this.limit;
            },
        };
    }
            
    /**
     * Composes a query that determines the relatiosnhip
     * between a given owner and guest.
     * 
     * A where clause can be subsequnetly added to the query
     * to identify the said owner
     * or a join clause can be added to dynamically identify the said owner
     * as part of a larger query.
     * 
     * @param object                   USER 
     * @param bool                     groupConcat 
     * 
     * @return object
     */
    static getOwnerGuestRelationshipQuery(USER, groupConcat = false) {
		var accessRightQueries = {};
		// Descendant access right
		accessRightQueries['DESCENDANT'] = 'FIND_IN_SET(id, "' + USER.lineage.replace(USER.id + '/', '').replace(/\//g, ',') + '")';
		// Child access right (also a descendant)
		accessRightQueries['DESCENDANT,CHILD'] = 'id = ' + USER.parent;
		// Sibling access right
		accessRightQueries['SIBLING'] = USER.parent + ' = parent';
		// Ancestor access right
		accessRightQueries['ANCESTOR'] = 'FIND_IN_SET(' + USER.id + ', REPLACE(REPLACE(lineage, CONCAT(id, "/"), ""), "/", ","))';
		// Parent access right (also an ancestor)
		accessRightQueries['ANCESTOR,PARENT'] = USER.id + ' = parent';
		// Direct attribution
        accessRightQueries['AUTHOR'] = 'id = ' + USER.id;
        // ------
		var compiledAccessRights = 'NULL'; // No access right
		_each(accessRightQueries, (assertion, right) => {
			compiledAccessRights = 'IF(' + assertion + ', "' + right + '", ' + compiledAccessRights + ')';
        });
        // ------
		return {
            table: _Factory.tables.account,
            select: (groupConcat ? 'GROUP_CONCAT(DISTINCT ' : '') + compiledAccessRights + (groupConcat ? ')' : '') + ' AS relationship',
            where: [],
            toString() {
                return 'SELECT ' + this.select 
                + ' FROM ' + this.table.name
                + (this.where.length ? ' WHERE ' + this.where.join(' AND ') : '');
            },
        };
    }
    
    /**
     * --------------------------------------------------
     * TOSTRING
     * --------------------------------------------------
     */
    
    /**
     * Stringifies the query.
     * 
     * @return string
     */
    toString() {
        return 'SELECT ' + this.select.join(', ') 
        + ' FROM ' + this.table.name + ' AS ' + this.alias
        + (this.EXPLICIT_TABLE_ACCESS_QUERY ? ' LEFT JOIN (' + this.EXPLICIT_TABLE_ACCESS_QUERY.query + ') AS ' + this.EXPLICIT_TABLE_ACCESS_QUERY.alias + ' ON ' + this.EXPLICIT_TABLE_ACCESS_QUERY.on.join(' AND ') : '')
        + (this.EXPLICIT_ROW_ACCESS_QUERY ? ' LEFT JOIN (' + this.EXPLICIT_ROW_ACCESS_QUERY.query + ') AS ' + this.EXPLICIT_ROW_ACCESS_QUERY.alias + ' ON ' + this.EXPLICIT_ROW_ACCESS_QUERY.on.join(' AND ') : '')
        + (this.AUTHOR_USER_RELATIONSHIP_QUERY ? ' LEFT JOIN (' + this.AUTHOR_USER_RELATIONSHIP_QUERY.query + ') AS ' + this.AUTHOR_USER_RELATIONSHIP_QUERY.alias + ' ON ' + this.AUTHOR_USER_RELATIONSHIP_QUERY.on.join(' AND ') : '')
        + ' WHERE ' + this.where.join(' AND ');
    }
    
    /**
     * --------------------------------------------------
     * ACCESS LOGIC
     * --------------------------------------------------
     */

	/**
	 * Creates the SQL logic that computes descreet access rules and all other rules into a final value
	 * - for entity access.
	 *
	 * @param string 	                accessType
	 * @param bool 		                withActingRights
	 *
	 * @return string
	 */
	deriveEntityAccess(accessType, withActingRights = false) {
		var entityAccess = [];
		if (this.EXPLICIT_ROW_ACCESS_QUERY) {
			entityAccess.push('JSON_EXTRACT(' + this.EXPLICIT_ROW_ACCESS_QUERY.alias + '.uac, "$.' + accessType + '")');
        }
        if (this.EXPLICIT_TABLE_ACCESS_QUERY) {
            entityAccess.push('JSON_EXTRACT(' + this.EXPLICIT_TABLE_ACCESS_QUERY.alias + '.uac, "$.' + accessType + '")');
        }
		entityAccess.push(Query.getRightsRulesIntersectionExpression(Query.rules(this.table.uac, accessType), this.getGuestRightsExpression(), withActingRights));
        // ---------------------
		return 'COALESCE(' + entityAccess.join(', ') + ')';
	}
	
	/**
	 * Creates the SQL logic that computes descreet access rules and all 
     * other rules into their final values
	 * - for table fields access.
	 *
	 * @param array 	                fields
	 * @param string 	                accessType
	 * @param bool 		                withActingRights
	 *
	 * @return object
	 */
	deriveFieldsAccess(fields, accessType, withActingRights = false) {
		var fieldsAccesses = {};
		fields.forEach(field => {
			var fieldAccess = [];
			if (this.EXPLICIT_ROW_ACCESS_QUERY) {
				fieldAccess.push('JSON_EXTRACT(' + this.EXPLICIT_ROW_ACCESS_QUERY.alias + '.fields, "$.' + field + '.uac.' + accessType + '")');
            }
            if (this.EXPLICIT_TABLE_ACCESS_QUERY) {
			    fieldAccess.push('JSON_EXTRACT(' + this.EXPLICIT_TABLE_ACCESS_QUERY.alias + '.fields, "$.' + field + '.uac.' + accessType + '")');
            }
            fieldAccess.push(Query.getRightsRulesIntersectionExpression(Query.rules(this.table.fields[field].uac, accessType), this.getGuestRightsExpression(), withActingRights));
			// In the form: id:"0"
			fieldsAccesses[field] = 'COALESCE(' + fieldAccess.join(', ') + ')';
		});
		return fieldsAccesses;
	}
    
    /**
     * --------------------------------------------------
     * ORGANIC RIGHTS
     * --------------------------------------------------
     */
 
    /**
     * Creates the SQL expression for all user rights:
     * Organic + Static Rights
     * 
     * return string
     */
    getGuestRightsExpression() {
        var rights = [];
		if (this.AUTHOR_USER_RELATIONSHIP_QUERY) {
			rights.push(this.AUTHOR_USER_RELATIONSHIP_QUERY.alias + '.relationship');
			if (this.AUTHOR_USER_TOKEN_QUERY) {
				rights.push('IF(' + this.AUTHOR_USER_TOKEN_QUERY.alias + '.id, "user", "")');
			}
        }
        if (this.USER.privileges.length) {
            rights.push('"' + this.USER.privileges.join(',') + '"');
        }
        // If all conditions above have been met, then we should have here:
        // CONCAT_WS(",", _RELATED_ACCOUNT.relationship, IF(_TOKEN.id, "user", ""), "ADMIN,ETC")
        // This would resolve to:
        // "ANCESTOR,PARENT,101,ADMIN,ETC";
        return rights.length ? 'CONCAT_WS(",", ' + rights.join(', ') + ')' : '""';
    }
    	
	/**
	 * Compiles to the SQL string that ssserts which of the current user's
     * total access rights (static + organic rights) passes the
	 * given access rules.
	 *
	 * @param array|string|bool|null	rules
	 * @param string					rightsExpression
	 * @param bool						withActingRights
	 *
	 * @return string
	 */
	static getRightsRulesIntersectionExpression(rules, rightsExpression, withActingRights = false) {
		var explicitFirstRule = _isBoolean(rules[0]) ? rules.shift() : null;
		// No rule? Implict TRUE of NULL.
		// Only rule is bool? Explicit TRUE/FALSE
		if (!rules.length) {
			return _isBoolean(explicitFirstRule) ? parseInt(explicitFirstRule) : 'NULL';
        }
        // ---------------------
		// Which RULES are satisfied by RIGHTS?
        // ---------------------
        var nodeAccessAssertions = [];
		rules.forEach(rule => {
            var ruleSql = [];
            // Where a rule specifies...
            // PARENT+ETC
			rule.split('+').forEach(r => {
				ruleSql.push('FIND_IN_SET("' + r + '", ' + rightsExpression + ')');
            });
            // Then we would have...
            // IF(FIND_IN_SET("PARENT". "ANCESTOR,PARENT,101,ADMIN,ETC") AND FIND_IN_SET("ETC". "ANCESTOR,PARENT,101,ADMIN,ETC"), "PARENT+ETC", NULL);
			nodeAccessAssertions.push('IF(' + ruleSql.join(' AND ') + ', "' + rule + '", NULL)');
        });
		// Gather none-NULL assertions
		nodeAccessAssertions = 'COALESCE(' + nodeAccessAssertions.join(', ') + ')';
        // ---------------------
		// So should we invert the given NULLness of the logic?
        // ---------------------
		return explicitFirstRule 
			? 'IF(ISNULL(' + nodeAccessAssertions + '), 1, 0)' 
			: 'IF(ISNULL(' + nodeAccessAssertions + '), 0, ' + (withActingRights ? nodeAccessAssertions : '1') + ')';
    }
    
    /**
     * Gets rules array
     * 
     * @param array                     rules
     * @param string                    accessType
     * 
     * @return array
     */
    static rules(rules, accessType) {
        if (_isObject(rules)) {
            rules = rules[accessType];
        }
        return _isEmpty(rules) 
            ? [] 
            : _arrFrom(rules);
    }
};