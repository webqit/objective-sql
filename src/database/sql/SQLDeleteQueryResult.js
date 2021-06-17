
/**
 * @imports
 */
import _DeleteQueryResult from '../_DeleteQueryResult.js';

/**
 * ---------------------
 * The SQLDeleteQueryResult class
 * ---------------------
 */
export default class SQLDeleteQueryResult extends _DeleteQueryResult {

    /**
     * Returns the affected rows for the query.
     * 
     * @param Bool withIDs
     * 
     * @return Array
     */
    async getAffectedRows(withIDs = false) {
        if (withIDs) {
            throw new Error(`The "withIDs" argument is not supported for delete queries.`)
        }
        return this.rawResultMeta.affectedRows;
    }
}