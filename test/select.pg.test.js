  
/**
 * @imports
 */
import Lexer from '@webqit/util/str/Lexer.js';
import { expect } from 'chai';
import Parser from '../src/parser/Parser.js';
import pg from 'pg';

const pgClient = new pg.Client({
    host: 'localhost',
    port: 5432,
});
await pgClient.connect();
const dd = `'kk' || "table_schema" || '...' || case WHEN 4=3 THEN '5' ELSE '--...' || 6 END`;
console.log('..........', await pgClient.query(`SELECT ${ dd } dd, 'You''re cool' ffff, 4 is distinct from 4, (CASE WHEN 4=3 THEN 5 ELSE 6 END)f_f from information_schema.tables limit 1`));


describe(`SELECT QUERIES`, function() {

    var ast1, expr1 = `SELECT ALL aaaa, "bbb"."bb" ali, age || \'kk\' || table_schema || \'...\' concatenation, 5 + 5 "s..|""um", 'You''re cool' ffff, JSON_AGG('{dd:2}') is distinct from 4, CASE subject WHEN a=1 THEN 'one' END ff, SUM(all id order by rrrrrr), (SELECT GG AS INNERALIAS FROM jj) ALIAS FROM (SELECT age as aaaa, time2 as bbbbb from table2 as t2) ta WHERE kk = 4 order by CASE WHEN 4=3 THEN 5 ELSE 6 END desc with rollup`;
    describe(`${expr1}`, function() {

        it(`"parse()" the expression and stringify to compare with original`, async function() {
            ast1 = await Parser.parse({}, expr1, null, { explain: false });
            console.log('\n\n\n\n\n\n', ast1 + '');
            expect(false).to.be.false;
        });

    });

});