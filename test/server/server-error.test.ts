import { ServerError, AppError } from '../../src/server/server-error';

test('Create error', () => {
    const error = ServerError.internalServerError.new();
    expect(error.message).toBe('Internal server error.');
    expect(error.code).toBe('internalServerError');
});

test('Create error and attach info', () => {
    const error = ServerError.internalServerError.new({ some: 'info' });
    expect(error.info).toEqual({
        some: 'info'
    });
});

test('Create error and attach cause', () => {
    const error = ServerError.internalServerError.new(undefined, new Error());
    expect(error.cause).toBeInstanceOf(Error);
});

test('Retrive status code of known error', () => {
    const internal = ServerError.internalServerError.new();
    expect(ServerError.statusOf(internal)).toBe(500);

    const badRequest = ServerError.badRequest.new();
    expect(ServerError.statusOf(badRequest)).toBe(400);
});


test('Retrive status code of unknown error', () => {
    expect(ServerError.statusOf(<AppError>{ code: 'unknown.Error.Code' })).toBe(500);
});
