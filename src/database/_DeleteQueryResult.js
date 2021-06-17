
/**
 * ---------------------
 * The _DeleteQueryResult class
 * ---------------------
 */
export default class _DeleteQueryResult {

    /**
     * Accepts the insert payload
     * 
     * @param _Table table
     * @param Object rawResultMeta
     * @param Object whereObj
     */
    constructor(table, rawResultMeta, whereObj) {
        this.table = table;
        this.rawResultMeta = rawResultMeta;
        this.whereObj = whereObj;
    }
}