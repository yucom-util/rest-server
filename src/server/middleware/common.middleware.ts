import { txid } from '@yucom/common';
import context from '@yucom/context';
import { ServerError } from '../server-error';

const headersMiddleware = (req: any, res: any, next: any) => {
    context.set('txid', req.headers['x-txid'] ? req.headers['x-txid'] : txid.create() );
    context.set('xheaders', Object.keys(req.headers)
            .filter(name => name.startsWith('x-'))
            .reduce((xheaders, name) => {
                    xheaders[name] = req.headers[name];
                    return xheaders;
            },      <object> {} ));
    next();
};

const pageNotFoundMiddleware = (pathsRecord: object) => (req: any, res: any, next: any) => {
    throw ServerError.notFound.new(pathsRecord);
};

export {
    headersMiddleware,
    pageNotFoundMiddleware
};
