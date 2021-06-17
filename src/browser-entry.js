
/**
 * @imports
 */
import ODB from './database/odb/ODBDriver.js';
import IDB from './database/idb/IDBDriver.js';

// As globals
if (!window.WebQit) {
	window.WebQit = {};
}
window.WebQit.ObjectiveSQL = {
	ODB,
	IDB
};
