
/**
 * @imports
 */
import ODB from './database/odb/ODBFactory.js';
import IDB from './database/idb/IDBFactory.js';

// As globals
if (!window.WQ) {
	window.WQ = {};
}
window.WQ.ObjectiveSQL = {
	ODB,
	IDB
};
