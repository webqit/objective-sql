 
/**
 * @imports
 */
import Install, { Parser, DB } from './install.js';

(async function() {

    await Install();

    console.log('  ');
    console.log('  ');
    console.log('It: Delete');
    var expr = 'DELETE FROM t1 USING table1 t1 WHERE t1.age < 60';
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

})();
