  
/**
 * @imports
 */
 import { expect } from 'chai';
 import { Client, SCHEMA, DATA } from './install.js';
 
 describe(`# INSTALL QUERIES`, function() {
 
    var databases;
    before(`Create database "db1", drop-if-exists`, async function() {
        databases = await Client.create('db1', SCHEMA, 'drop'/* onExists */);
    });

    it(`Ensure database "db1" exists`, async function() {
        expect(await Client.list()).to.be.an('array').that.deep.include({name: 'db1', version: 0});
        expect(await Client.has()).to.be.true;
    });

    it(`Create table/store "table1", add 3 rows and confirm: ['1', '2', '3']`, async function() {
        var table1 = await databases.open('table1', 'readwrite');
        expect(table1).to.respondTo('addAll');

        var addQuery = await table1.addAll(DATA.table1);
        expect(addQuery).to.be.an('array').that.eql(['1', '2', '3']);
    });

    it(`Create table/store "table2", add 3 rows and confirm: ['1', '2', '3']`, async function() {
        var table2 = await databases.open('table2', 'readwrite');
        expect(table2).to.respondTo('addAll');

        var addQuery = await table2.addAll(DATA.table2);
        expect(addQuery).to.be.an('array').that.eql(['1', '2', '3']);
    });

    it(`Create table/store "table3", add 3 rows and confirm: ['1', '2', '3']`, async function() {
        var table3 = await databases.open('table3', 'readwrite');
        expect(table3).to.respondTo('addAll');

        var addQuery = await table3.addAll(DATA.table3);
        expect(addQuery).to.be.an('array').that.eql(['1', '2', '3']);
    });

});
