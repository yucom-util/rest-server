jest.mock('express');

import { CreateServer } from '../../src/server/server';
import Express from 'express';
import { doesNotReject } from 'assert';

const ExpressMock: any = Express;
let ExpressAppMock = undefined;

beforeEach(() => {
    const use = jest.fn(() => { return {}; });
    const listen = jest.fn(() => { return {}; });
    ExpressAppMock = { use, listen};
    ExpressMock.mockReturnValue(ExpressAppMock);
});


test('start server without config', () => {
    CreateServer().listen();
    expect(ExpressAppMock.use).toBeCalledTimes(8);
    expect(ExpressAppMock.listen).toBeCalledTimes(1);
});

test('start server with port', () => {
    CreateServer().listen(10000);
    expect(ExpressAppMock.use).toBeCalledTimes(8);
    expect(ExpressAppMock.listen).toBeCalledTimes(1);
});

test('Cannot restart a server', async done => {
    const app = CreateServer();
    app.listen(10000);
    try {
      await app.listen(10000);
      fail('Listen called again is not supported');
    } finally {
      done();
    }
});

test('Cannot use ready before listen', async done => {
    const app = CreateServer();
    try {
      await app.ready();
      fail('Listen called again is not supported');
    } finally {
      done();
    }
});

