 
/**
 * @imports
 */
import Install, { Parser, DB } from './install.js';

(async function() {

    await Install();

    console.log('  ');
    console.log('  ');
    console.log('It: Delete'); 
    var expr = 'UPDATE table2 t2 set fname = "New FNAME"';
    var ParserParse = Parser.parse(expr, null, {DB_FACTORY: DB, explain: true});
    // ------------------------
    console.log('Expects: ' + expr);
    console.log(ParserParse.stringify({interpreted: true}));
    // ------------------------
    console.log('Expects: 2 rows');
    console.log(await ParserParse.eval(DB));

    if (DB.databases) {
        console.log(DB.databases.db1);
    }
    // ------------------------





    console.log('  ');
    console.log('  ');
    console.log('It: Delete'); 
    var expr = 'UPDATE WITH UAC table2 t2, table3 t3 set t2.lname = 100, t3.lname = 500 WHERE t2.age = 20 AND t3.age = 10';
    var ParserParse = Parser.parse(expr, null, {DB_FACTORY: DB, explain: true});
    // ------------------------
    console.log('Expects: ' + expr);
    console.log(ParserParse.stringify());
    // ------------------------
    console.log('Expects: 2 rows');
    console.log(await ParserParse.eval(DB));

    if (DB.databases) {
        console.log(DB.databases.db1);
    }
    // ------------------------




    console.log('  ');
    console.log('  ');
    console.log('It: Delete'); 
    var expr = 'UPDATE (select id, ffnn, aaggee aaagggeee from (select id, SUM(fname) ffnn, age aaggee from table2) ta) tb set ffnn = "ddddddddddddd", aaagggeee = 900 WHERE aaagggeee = 22';
    //var ParserParse = Parser.parse(expr, null, {DB_FACTORY: DB, explain: true});
    // ------------------------
    console.log('Expects: ' + expr);
    //console.log(ParserParse.stringify());
    // ------------------------
    console.log('Expects: 2 rows');
    //console.log(await ParserParse.eval(DB));
    console.log(await DB.query(expr));
    if (DB.databases) {
        console.log(DB.databases.db1);
    }
    // ------------------------

})();