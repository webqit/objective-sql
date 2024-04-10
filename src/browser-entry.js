
/**
 * @imports
 */
import ODB from './database/odb/ODBClient.js';
import IDB from './database/idb/IDBClient.js';
import SQL from './database/sql/SQLClient.js';

// As globals
if (!self.webqit) { self.webqit = {}; }
self.webqit.ObjectiveSQL = {
	ODB,
	IDB,
	SQL
};
