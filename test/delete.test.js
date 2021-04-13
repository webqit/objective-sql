 
/**
 * @imports
 */
import { expect } from 'chai';
import { Client, SCHEMA, DATA, Parser } from './install.js';

describe(`# DELETE QUERIES`, function() {

    before('Import into DB', async function() {
        await Client.import('db1', {schema: SCHEMA, data: DATA}, 'drop'/* onExists */);
    });

    var ast1, expr1 = `DELETE FROM t1 USING table1 t1 WHERE t1.age < 60`;
    describe(`## ${expr1}`, function() {

        it(`"parse()" the expression and stringify to compare with original`, function() {
            ast1 = Parser.parse(expr1, null, {DB_FACTORY: Client, explain: false});
            expect(ast1.stringify().toLowerCase()).to.be.equal(expr1.toLowerCase());
        });

        it(`"eval()" the expression and expect affected rows to be: { t1: [ [1], [2] ] }`, async function() {
            var result = await ast1.eval(Client);
            expect(result).to.be.an('object').that.have.keys('t1');
            expect(result.t1).to.be.an('array').that.eql([ [1], [2] ]);
        });

    });

});
