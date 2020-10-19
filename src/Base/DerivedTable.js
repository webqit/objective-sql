
/**
 * @imports
 */
import Table from './Table.js';

/**
 * ---------------------------
 * DerivedTable class
 * ---------------------------
 */				

export default class DerivedTable extends Table {
    	 
	/**
	 * @inheritdoc
	 */
	async getStore() {
		return await this.DB;
	}
};