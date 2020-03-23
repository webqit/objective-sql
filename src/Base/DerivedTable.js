
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
	constructor(database, query, alias, iterateOnce = false) {
		super([], alias, iterateOnce);
		this.database = database;
		this.query = query;
		this.derivative = this.query.bind(this.database);
	}
	 
	/**
	 * @inheritdoc
	 */
	next() {
		if (!this.eof) {
			var row = this.derivative.fetch();
			if (row) {
				this.rows.push(row);
			} else {
				this.eof = true;
			}
		}
		return super.next();
	}
};

/**
 * @exports
 */
export default DerivedTable;
