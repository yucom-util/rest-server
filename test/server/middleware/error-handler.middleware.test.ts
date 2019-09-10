import { ServerError } from '../../../src/server/server-error';
import { ErrorHandlerMiddleware } from '../../../src/server/middleware/error-handler.middleware';

const res: any = {};
res.status = jest.fn(() => res);
res.send = jest.fn(() => res);

test('handler error of unknown type', () => {
    const err = 5;
    const errExpected = ServerError.internalServerError.new(5);

    ErrorHandlerMiddleware(err, <any> {}, res, undefined);

    expect(res.status).toBeCalledWith(500);
    expect(res.send).toBeCalledWith(errExpected);
});

test('handler error of type Error', () => {
    const err = new Error();
    const errExpected = ServerError.internalServerError.new(undefined, err);

    ErrorHandlerMiddleware(err, <any> {}, res, undefined);

    expect(res.status).toBeCalledWith(500);
    expect(res.send).toBeCalledWith(errExpected);
});

test('handle ServerError', () => {
    const err = ServerError.badRequest.new();
    const errExpected = ServerError.badRequest.new();

    ErrorHandlerMiddleware(err, <any> {}, res, undefined);

    expect(res.status).toBeCalledWith(ServerError.statusOf(errExpected));
    expect(res.send).toBeCalledWith(errExpected);
});
