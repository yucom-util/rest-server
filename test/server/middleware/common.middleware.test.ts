
jest.mock('@yucom/context');
jest.mock('@yucom/common');

import { txid , code as CodeImported } from '@yucom/common';
const code = <typeof CodeImported> jest.requireActual('@yucom/common').code;
const txidMock = <any> txid;
const codeMock = <jest.Mocked<typeof code>> CodeImported;
codeMock.complete.mockImplementation(code.complete);


import { pageNotFoundMiddleware, headersMiddleware } from '../../../src/server/middleware/common.middleware';
import { ServerError as ServerErrorType } from '../../../src/server/server-error';

const ServerError = <typeof ServerErrorType> jest.requireActual('../../../src/server/server-error').ServerError;

import context from '@yucom/context';
const contextMock = <any> context;

beforeEach(() => {
    txidMock.create.mockReset();
    contextMock.set.mockReset();
});

test('pageNotFoundMiddleware -> throw error', () => {
    const info = { some: 'info'};
    const expectError = ServerError.notFound.new({ some: 'info' });

    try {
        pageNotFoundMiddleware(info)(undefined, undefined, undefined);
    } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toEqual(expectError);
        expect(error.info).toEqual(expectError.info);
    }
});

test('headersMiddleware -> get context txid', () => {
    const next = jest.fn(() => { return; });
    const req = {
        headers: {
            'x-txid': 'someId'
        }
    };

    headersMiddleware(req, undefined, next);
    expect(contextMock.set).toBeCalledTimes(2);
    expect(contextMock.set.mock.calls[0]).toEqual(['txid', 'someId']);
    expect(contextMock.set.mock.calls[1]).toEqual(['xheaders', { 'x-txid': 'someId' }]);
    expect(next).toBeCalled();
});

test('headersMiddleware -> set context txid', () => {
    const next = jest.fn(() => { return; });
    const req = {
        headers: {}
    };

    headersMiddleware(req, undefined, next);
    expect(contextMock.set).toBeCalledTimes(2);
    expect(txidMock.create).toBeCalled();
    expect(next).toBeCalled();
});

test('headersMiddleware -> get headers', () => {
    const next = jest.fn(() => { return; });
    const req = {
        headers: {
            'x-txid': 'someId',
            invalidheader1: 'invalid',
            xinvalidheader2: 'invalid',
            'X-INVALIDHEADER': 'invalid',
            'x-validheader': 'valid'
        }
    };

    headersMiddleware(req, undefined, next);
    expect(contextMock.set).toBeCalledWith('txid', 'someId');
    expect(contextMock.set).toBeCalledWith('xheaders', { 'x-txid': 'someId', 'x-validheader': 'valid' });
    expect(next).toBeCalled();
});
