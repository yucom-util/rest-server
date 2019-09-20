import { StartServer} from '../src/server/server';
import { ServerError } from '../src/server/server-error';
import { connect, ErrorCodes } from '@yucom/rest-client';
import http from 'http';
import log from '@yucom/log';
log.setLevel('none');


function moment() {
    return new Promise(function(resolve) {
        setTimeout(resolve, 500);
    });
}


const people: any[] = [];
const app = StartServer(7000);

const client = connect('http://localhost:7000');

describe('Integration', () => {
    beforeAll(() => {

        app.create.people(async (person: any) => {
            person.id = people.length;
            people.push(person);
            await moment();
            return person;
        });
        app.create.people.$id.phones.$type(async (phone: any, id, type) => {
            const person = people[Number.parseInt(id, 10)];
            if (!person.phones) person.phones = {};
            person.phones[type] = phone;
            phone.id = type;
            await moment();
            return phone;
        });
        app.create.invalid(async () => {
            await moment();
            throw ServerError.badRequest.new({ hello: 'world'});
        });

        app.get.people.$id(async (personId: string) => {
            const id = Number.parseInt(personId, 10);
            if (!people[id]) throw ServerError.notFound.new({ personId });
            await moment();
            return people[id];
        });
        app.get.people.$person_id.phones.$type(async (personId: string, phoneId: string) => {
            const id = Number.parseInt(personId, 10);
            if (!people[id]) throw ServerError.notFound.new({ personId });
            if (!people[id].phones || !people[id].phones[phoneId]) throw ServerError.notFound.new({ personId, phoneId });
            await moment();
            return people[id].phones[phoneId];
        });

        app.invoke.sum(async (data: {a: number, b: number}) => {
            await moment();
            return data.a + data.b;
        });
        app.invoke.err(async (data: {a: number, b: number}) => {
            await moment();
            throw new Error('Some error');
        });

        app.list.people(async function() {
            await moment();
            if (this.args.sort && this.args.sort !== 'name') throw Error();
            return people;
        });

        app.remove.people.$id(async function(id) {
            await moment();
            const pid = Number.parseInt(id, 10);
            people.splice(pid, 1);
        });
    });

    describe('Create', () => {

        it('Success', async () => {
            const expectedId = people.length;

            const john = await client.create.people({ name: 'John', lastname: 'Connor' });

            expect(john.id).toBe(expectedId);
            expect(john.name).toBe('John');
            expect(john.lastname).toBe('Connor');

            const phone = await client.create.people[expectedId].phones.mobile({ number: '12345678' });
            expect(phone.id).toBe('mobile');
            expect(phone.number).toBe('12345678');
        });

        it('Invalid JSON => 400', async done => {
          const data = '{hello:"world"}';
          const options = {
            hostname: 'localhost',
            port: 7000,
            path: '/people',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': data.length
            }
          };
          const req = http.request(options, res => {
            expect(res.statusCode).toBe(400);
            done();
          });
          req.write(data);
          req.end();
        });

        it('Not found', async done => {
            try {
                await client.create.persons({ name: 'John', lastname: 'Connor'});
                fail();
            } catch (err) {
                expect(ErrorCodes.notFound.is(err)).toBeTruthy();
                done();
            }
        });

        it('Server generated error', async done => {
            try {
                await client.create.invalid({ name: 'John', lastname: 'Connor'});
                fail();
            } catch (err) {
                expect(ErrorCodes.badRequest.is(err)).toBeTruthy();
                expect(err.info.hello).toBe('world');
                done();
            }
        });
    });

    describe('Get', () => {

        it('Success', async () => {

            const john = await client.get.people(0);

            expect(john.id).toBe(0);
            expect(john.name).toBe('John');
            expect(john.lastname).toBe('Connor');

            const phone = await client.get.people[0].phones['mobile']();

            expect(phone.id).toBe('mobile');
            expect(phone.number).toBe('12345678');
        });

        it('Not found', async done => {
            try {
                await client.get.people(111);
                fail();
            } catch (err) {
                expect(ErrorCodes.notFound.is(err)).toBeTruthy();
                done();
            }
        });

    });

    describe('Invoke', () => {

        it('Success', async () => {

            const sum = await client.invoke.sum({ a: 12, b: 21 });

            expect(sum).toBe(33);
        });

        it('Error is converted to internal error', async done => {
            try {
                await client.invoke.err({ a: 12, b: 21 });
                fail();
            } catch (err) {
                expect(ErrorCodes.internalServerError.is(err)).toBeTruthy();
                expect(err.cause.message).toBe('Some error');
                done();
            }
        });

    });

    describe('List', () => {

        it('Success', async function() {

            const list = await client.list.people({ sort: 'name' });

            expect(list.length).toBe(1);
        });

    });

    describe('Remove', () => {

        it('Success', async function() {

            const john2 = await client.create.people({ name: 'John2', lastname: 'Connor2' });

            const count = (await client.list.people()).length;

            await client.remove.people(john2.id);

            expect((await client.list.people()).length).toBe(count - 1);
        });

    });

    afterAll(() => app.close() );
});
