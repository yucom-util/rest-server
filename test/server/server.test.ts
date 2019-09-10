jest.mock('express');

import { StartServer } from '../../src/server/server';
import Express from 'express';

const ExpressMock: any = Express;
let ExpressAppMock = undefined;

beforeEach(() => {
    const use = jest.fn(() => { return {}; });
    const listen = jest.fn(() => { return {}; });
    ExpressAppMock = { use, listen};
    ExpressMock.mockReturnValue(ExpressAppMock);
});


test('start server without config', () => {
    StartServer();
    expect(ExpressAppMock.use).toBeCalledTimes(8);
    expect(ExpressAppMock.listen).toBeCalledTimes(1);
});


test('start server with port', () => {
    StartServer(10000);
    expect(ExpressAppMock.use).toBeCalledTimes(8);
    expect(ExpressAppMock.listen).toBeCalledTimes(1);
});

