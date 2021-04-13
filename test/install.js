 
/**
 * @imports
 */
import Parser from '../src/index.js';
import ODB from '../src/database/odb/ODBFactory.js';
import IDB from '../src/database/idb/IDBFactory.js';

/**
import SQL from '../src/database/sql/SQLFactory.js';

await SQL.connect('mysql', {
	host: 'localhost',
	user: 'root',
	password: '',
});
var Client = SQL;
 */

var Client = ODB;
var INSTALL_STYLE = 'import';

var SCHEMA = [
	{
		name: 'table1',
		primaryKey: 'id',
		autoIncrement: true,
		fields:{id:{}, parent: {}, fname:{}, lname:{default:'Default Lname1'}, age:{type: 'int', default:0}, time1:{type: 'timestamp', onupdate: 'CURRENT_TIMESTAMP'}, time2:{type: 'datetime', default: 'CURRENT_TIMESTAMP'}},
		uniqueKeys: {age: 'age'},
	},
	{
		name: 'table2',
		primaryKey: 'id',
		autoIncrement: true,
		fields: {id:{type:'int'}, parent: {}, fname:{}, lname:{default:'Default Lname2'}, age:{type: 'int', default:0}, tablename:{default: 't2'}, parent:{
			referencedEntity: {name: 'table2'}
		}, time1:{type: 'timestamp', onupdate: 'CURRENT_TIMESTAMP'}, time2:{type: 'datetime', default: 'CURRENT_TIMESTAMP'}},
		uniqueKeys: {age: 'age'},
	},
	{
		name: 'table3',
		primaryKey: 'id',
		autoIncrement: true,
		fields:{id:{}, parent: {nullable: true}, fname:{}, lname:{default:'Default Lname3'}, age:{type: 'int', default:0}, tablename:{default: 't3'}, time1:{type: 'timestamp', onupdate: 'CURRENT_TIMESTAMP'}, time2:{type: 'datetime', default: 'CURRENT_TIMESTAMP'}},
		uniqueKeys: {age: 'age'},
	},
	{
		name: 'table4',
		primaryKey: 'id',
		autoIncrement: true,
		fields:{id:{}, parent: {}, fname:{}, lname:{default:'Default Lname4'}, age:{type: 'int', default:0}, tablename:{default: 't4'}, time1:{type: 'timestamp', onupdate: 'CURRENT_TIMESTAMP'}, time2:{type: 'datetime', default: 'CURRENT_TIMESTAMP'}},
		uniqueKeys: {age: 'age'},
	},
];

var DATA = {
	table1:[
		{fname: 'John', lname: 'Doe', age: 33},
		{fname: 'James', lname: 'Smith', age: 40},
		{fname: 'Tim', lname: 'Cook', age: 60},
	],
	table2:[
		{fname: 'John2', lname: 'Doe2', age: 22, parent: null},
		{fname: 'James2', lname: 'Smith2', age: 20, parent: 1},
		{fname: 'Tim2', lname: 'Cook2', age: 30, parent: 2},
	],
	table3:[
		{fname: 'John3', lname: 'Doe3', age: 11},
		{fname: 'James3', lname: 'Smith3', age: 10},
		{fname: 'Tim3', lname: 'Cook3', age: 15},
	],
	table4:[
	],
};

export {
	Parser,
	IDB,
	ODB,
	Client,
	SCHEMA,
	DATA,
};