 
/**
 * @imports
 */
import pg from 'pg';
import { expect } from 'chai';
import SQLClient from '../src/database/sql/SQLClient.js';

// --------------------------
const pgClient = new pg.Client({
    host: 'localhost',
    port: 5432,
});
await pgClient.connect();
let $pgClient = { query(sql, ...args) {
    console.log(`\n\n\n\nSQL:`, sql);
    return pgClient.query(sql, ...args);
} };
const sqlClient = new SQLClient(pgClient, { dialect: 'postgres' });
// --------------------------

describe(`Postgres Savepoints & Rollbacks`, function() {

    before(async function() {
        await sqlClient.dropDatabase('obj_information_schema', { ifExists: true, cascade: true, noCreateSavepoint: true });
        await sqlClient.dropDatabase('some_db', { ifExists: true, cascade: true, noCreateSavepoint: true });
        await sqlClient.dropDatabase('new_db_name', { ifExists: true, cascade: true, noCreateSavepoint: true });
        await sqlClient.alterDatabase('private', db => db.name = 'public', { ifExists: true, noCreateSavepoint: true });
    });

    const desc0 = `Rename DB "public" to "private".`;
    describe(`Rename DB and rollback`, function() {

        let dbApi, savepoint0;

        it(`DO: ${ desc0 }`, async function() {
            savepoint0 = await sqlClient.alterDatabase('public', dbSchema => {
                dbSchema.name = 'private';
            }, {
                savepointDesc: 'Rename to private',
            });
            dbApi = sqlClient.database('public');
            const databases = await sqlClient.databases();
            expect(databases).to.be.an('array').that.includes('private').and.not.includes('public');
        });

        it(`ROLLBACK: ${ desc0 }`, async function() {
            const status = await savepoint0.rollback();
            expect(status).to.be.true;
            const databases = await sqlClient.databases();
            expect(databases).to.be.an('array').that.includes('public').and.not.includes('private');
        });

        it(`ROLLFORWARD: ${ desc0 }`, async function() {
            const savepoint = await dbApi.savepoint({ direction: 'forward' });
            const status = await savepoint.rollback();
            expect(status).to.be.true;
            const databases = await sqlClient.databases();
            expect(databases).to.be.an('array').that.includes('private').and.not.includes('public');
        });

        it(`ROLLBACK: ${ desc0 }`, async function() {
            const savepoint = await dbApi.savepoint();
            const status = await savepoint.rollback();
            expect(status).to.be.true;
            const databases = await sqlClient.databases();
            expect(databases).to.be.an('array').that.includes('public').and.not.includes('private');
        });

        it(`ADD TABLE "test1"`, async function() {
            const tblCreateRequest = {
                name: 'test2',
                columns: [
                    { name: 'id', type: 'int', primaryKey: true },
                ]
            };
            const savepoint2 = await dbApi.createTable(tblCreateRequest, { ifNotExists: true });
            const tables = await dbApi.tables();
            expect(tables).to.be.an('array').that.includes('test2');
        });

    });

    const desc1 = `Create DB "some_db" with two tables: "test0" and "books".`;
    describe(`Create fresh DB of two tables and rollback`, function() {

        const dbCreateRequest = {
            name: 'some_db',
            tables: [{
                name: 'test0',
                columns: [
                    { name: 'id', type: 'int', primaryKey: true },
                ]
            }, {
                name: 'books',
                columns: [
                    { name: 'id', type: 'int', primaryKey: true },
                    { name: 'author1', type: 'int', references: { table: 'test0', columns: ['id'] }, },
                    { name: 'author2', type: 'int', },
                    { name: 'content', type: { name: 'varchar', maxLen: 30 }, default: { expr: '\'Hello world\'' }, },
                    { name: 'isbn', type: 'int', identity: { always: false }, notNull: true },
                ],
                constraints: [
                    { type: 'FOREIGN KEY', columns: ['author2'], references: { table: 'test0', columns: ['id'] } },
                    { type: 'UNIQUE KEY', columns: ['author2', 'author1'] },
                ],
                indexes: []
            }]
        };

        let dbApi;

        it(`DO: ${ desc1 }`, async function() {
            dbApi = await sqlClient.createDatabase(dbCreateRequest);
            const databases = await sqlClient.databases();
            expect(databases).to.be.an('array').that.includes('some_db');
            const tables = await dbApi.tables();
            expect(tables).to.be.an('array').that.eql(['test0','books']);
        });

        it(`ROLLBACK: ${ desc1 } (BY DROPPING DB)`, async function() {
            const savepoint0 = await dbApi.savepoint();
            const status = await savepoint0.rollback({ allowMutateDB: true });
            expect(status).to.be.true;
            const databases = await sqlClient.databases();
            expect(databases).to.be.an('array').that.not.includes('some_db');
        });

        it(`ROLLFORWARD: ${ desc1 } (BY RECREATING DB & TABLES)`, async function() {
            const savepoint = await dbApi.savepoint({ direction: 'forward' });
            const status = await savepoint.rollback({ allowMutateDB: true });
            expect(status).to.be.true;
            const databases = await sqlClient.databases();
            expect(databases).to.be.an('array').that.includes('some_db');
            const tables = await dbApi.tables();
            expect(tables).to.be.an('array').that.eql(['test0','books']);
        });

        it(`ROLLBACK: ${ desc1 } (BY DROPPING DB)`, async function() {
            const savepoint = await dbApi.savepoint();
            const status = await savepoint.rollback({ allowMutateDB: true });
            expect(status).to.be.true;
            const databases = await sqlClient.databases();
            expect(databases).to.be.an('array').that.not.includes('some_db');
        });

        it(`ROLLFORWARD: ${ desc1 } (BY RECREATING DB & TABLES)`, async function() {
            const savepoint = await dbApi.savepoint({ direction: 'forward' });
            const status = await savepoint.rollback({ allowMutateDB: true });
            expect(status).to.be.true;
            const databases = await sqlClient.databases();
            expect(databases).to.be.an('array').that.includes('some_db');
            const tables = await dbApi.tables();
            expect(tables).to.be.an('array').that.eql(['test0','books']);
        });

        it(`ADD TABLE "test1"`, async function() {
            const tblCreateRequest = {
                name: 'test1',
                columns: [
                    { name: 'id', type: 'int', primaryKey: true },
                ]
            };
            const savepoint2 = await dbApi.createTable(tblCreateRequest);
            const tables = await dbApi.tables();
            expect(tables).to.be.an('array').that.eql(['test0','books','test1']);
        });

        it(`ALTER whole DB`, async function() {
            const dbAlterRequest = {
                name: 'some_db',
                tables: ['test0', 'books', 'test1'],
            };
            const savepoint3 = await sqlClient.alterDatabase(dbAlterRequest, dbSchema => {
                // Rename DB
                dbSchema.name = 'new_db_name';
                // Modify column
                dbSchema.tables.get('test0').columns.get('id').uniqueKey = true;
                // Remove test1 table
                dbSchema.tables.delete('test1');
                /// Add table test2
                dbSchema.tables.push({
                    name: 'test2',
                    columns: [
                        { name: 'id', type: 'int', primaryKey: true },
                    ]
                });
            });
            expect(dbApi.name).to.eql('new_db_name');
            const tables = await dbApi.tables();
            expect(tables).to.be.an('array').that.eql(['test0','books','test2']);
            const test0 = await dbApi.describeTable('test0');
            expect(test0.columns.find(col => col.name === 'id').uniqueKey).to.be.an('object');

            //console.log((await pgClient.query(`SELECT * FROM obj_information_schema.database_savepoints ORDER BY savepoint_date ASC`)).rows);
        });

    });

});
