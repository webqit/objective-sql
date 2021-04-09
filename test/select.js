 
/**
 * @imports
 */
import Install, { Parser, DB } from './install.js';

(async function() {

    await Install();



	console.log('  ');
	console.log('  ');
	console.log('It: Select; Group By, with roolup');
	var expr = 'SELECT aaaa, bbbbb FROM (SELECT age as aaaa, time2 as bbbbb FROM table2 as t2) ta';
	//var ParserParse = Parser.parse(expr, null, {DB_FACTORY: DB, validation: true,});
	// ------------------------
	console.log('Expects: ' + expr);
	//console.log(ParserParse.stringify());
	// ------------------------
	console.log('Expects: 4 rows');
	//console.log(await ParserParse.eval(DB));
	console.log(expr, await DB.query(expr));

	//console.log(ParserParse.exprs.TABLE_REFERENCES.getSchema());

	//return;


	console.log('  ');
	console.log('  ');
	console.log('It: Simple select');
	var expr = 'SELECT COUNT(parent) FROM db1.table2';
	//var ParserParse = Parser.parse(expr, null, {DB_FACTORY: DB});
	// ------------------------
	console.log('Expects: ' + expr);
	//console.log(ParserParse.stringify());
	// ------------------------
	console.log('Expects: 3 rows');
	//console.log(await ParserParse.eval(DB));
	console.log(await DB.query(expr));
	

	console.log('  ');
	console.log('  ');
	console.log('It: Select; Group By, with roolup');
	var expr = 'SELECT t2.age, ANY_VALUE(t2.age), SUM(t2.age) total, IF (GROUPING(t2.age), "Grand Total", t1.age) age FROM table1 t1, table2 t2 GROUP BY t2.age WITH ROLLUP';
	var ParserParse = Parser.parse(expr, null, {DB_FACTORY: DB});
	// ------------------------
	console.log('Expects: ' + expr);
	console.log(ParserParse.stringify());
	// ------------------------
	console.log('Expects: 4 rows');
	console.log(await ParserParse.eval(DB));



	console.log('  ');
	console.log('  ');
	console.log('It: Select, Join, Where, Order By');
	var expr = 'SELECT ALL t1.age, t1.fname, t1.lname, CONCAT_WS(" ", t1.fname, t1.lname) as fullname, t2.lname lname2 FROM table1 t1, table2 t2 WHERE t1.age > 1 ORDER BY lname DESC, lname2 DESC';
	var ParserParse = Parser.parse(expr, null, {DB_FACTORY: DB});
	// ------------------------
	console.log('Expects: ' + expr);
	console.log(ParserParse.stringify());
	// ------------------------
	console.log('Expects: 9 rows');
	console.log(await ParserParse.eval(DB));
	// ------------------------

// ------------------------




	console.log('  ');
	console.log('  ');
	console.log('It: Window functions');
	var expr = 'SELECT t1.age, SUM( DISTINCT t1.age) OVER (PARTITION BY t2.tablename ORDER BY t2.tablename) totalAge, t1.fname, t2.lname FROM table1 t1, table2 t2';
	var ParserParse = Parser.parse(expr, null, {DB_FACTORY: DB, explain: false});
	// ------------------------
	console.log('Expects: ' + expr);
	console.log(ParserParse.stringify());
	// ------------------------
	console.log('Expects: 9 rows');
	console.log(await ParserParse.eval(DB));
	// ------------------------




	console.log('  ');
	console.log('  ');
	console.log('It: Arrow Reference');
	//var expr = 'SELECT t2.id, t2.age, parent->id FROM table2 t2';
	var expr = 'SELECT t2.id, t2.age, `parent~>id` FROM table2 t2 WHERE parent~>id = 1 or parent~>id = 2';
	var ParserParse = Parser.parse(expr, null, {DB_FACTORY: DB});
	// ------------------------
	console.log('Expects: ' + expr);
	console.log(ParserParse.stringify());
	// ------------------------
	console.log('Expects: 2 rows');
	console.log(await ParserParse.eval(DB));
	// ------------------------


	console.log('  ');
	console.log('  ');
	console.log('It: SELECT *');
	var expr = 'SELECT t2.id, parent~>id, parent~>parent~>id, parent<~table2~>id, parent<~parent<~table2~>id FROM table2 t2';
	//var ParserParse = Parser.parse(expr, null, {DB_FACTORY: DB});
	// ------------------------
	console.log('Expects: ' + expr);
	//console.log(ParserParse.stringify({interpreted: false}));
	// ------------------------
	console.log('Expects: 3 rows');
	console.log(await DB.query(expr));
	// ------------------------


	console.log('  ');
	console.log('  ');
	console.log('It: SELECT WITH UAC');
	var expr = 'SELECT WITH UAC t2.id, t2.parent~>id, age FROM table2 t2 where t2.age = :age';
	var ParserParse = Parser.parse(expr, null, {DB_FACTORY: DB});
	// ------------------------
	console.log('Expects: ' + expr);
	console.log(ParserParse.stringify({interpreted:false}));
	// ------------------------
	console.log('Expects: 1 row');
	console.log(await ParserParse.eval(DB, {vars:{age:30}}));
	// ------------------------


	return;

})();
