
/**
 * @imports
 */
import ODB from './database/odb/ODBFactory.js';
import IDB from './database/idb/IDBFactory.js';

// As globals
if (!window.WebQit) {
	window.WebQit = {};
}
window.WebQit.ObjectiveSQL = {
	ODB,
	IDB
};
