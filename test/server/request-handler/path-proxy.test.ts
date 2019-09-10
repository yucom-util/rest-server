import { ProxyPathHandler } from '../../../src/server/request-handler/path-proxy';

test('common use of proxy', () => {
    const fn = jest.fn(() => { return 10; });

    const proxy: any = ProxyPathHandler.create([], fn);
    expect(proxy.length).toBe(0);

    proxy.first.some.other(5, 34, 'some');
    expect(fn).toBeCalledWith(['first', 'some', 'other'], 5);
});

