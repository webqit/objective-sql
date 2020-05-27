
/**
 * @imports
 */
import Table from './Table.js';

/**
 * ---------------------------
 * DerivedTable class
 * ---------------------------
 */				

const DerivedTable = class extends Table {
	 
	/**
	 * @inheritdoc
	 */
	constructor(database, query, alias, schema, iterateOnce = false) {
		super(query.eval(database), alias, schema, iterateOnce);
	}
};

/**
 * @exports
 */
export default DerivedTable;
