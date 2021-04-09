 
/**
 * @imports
 */
import Install, { Parser, DB } from './install.js';

(async function() {

    await Install();

    console.log('  ');
    console.log('  ');
    console.log('It: Delete');
    var expr = 'INSERT INTO table1 SET fname = "New name", age = 9000';
    var ParserParse = Parser.parse(expr, null, {DB_FACTORY: DB, explain: false});
    // ------------------------
    console.log('Expects: ' + expr);
    console.log(ParserParse.stringify({interpreted:true}));
    // ------------------------
    console.log('Expects: 1 rows');
    console.log(await ParserParse.eval(DB));

    if (DB.databases) {
        console.log(DB.databases.db1);
    }




    console.log('  ');
    console.log('  ');
    console.log('It: Delete'); // 
    var expr = 'INSERT IGNORE INTO table3 (fname, lname, age) VALUES ("Jakes", "Robertson", 1000), ("Jakes", "Robertson", 1000) ON DUPLICATE KEY UPDATE fname = "Updated name", age = 7000';
    var ParserParse = Parser.parse(expr, null, {DB_FACTORY: DB, explain: false});
    // ------------------------
    console.log('Expects: ' + expr);
    console.log(ParserParse.toString());
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
    var expr = 'INSERT INTO table4 SELECT * FROM table3';
    var ParserParse = Parser.parse(expr, null, {DB_FACTORY: DB, explain: false});
    // ------------------------
    console.log('Expects: ' + expr);
    console.log(ParserParse.stringify({interpreted:true}));
    // ------------------------
    console.log('Expects: 2 rows');
    console.log(await ParserParse.eval(DB));

    if (DB.databases) {
        console.log(DB.databases.db1);
    }

})();
