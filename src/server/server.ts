import context from '@yucom/context';
import Log from '@yucom/log';
import Express from 'express';
import BodyParser from 'body-parser';
import CookieParser from 'cookie-parser';
import Compression from 'compression';
import { RequestHandler } from './request-handler/request-handler';
import { ErrorHandlerMiddleware } from './middleware/error-handler.middleware';
import { headersMiddleware, pageNotFoundMiddleware } from './middleware/common.middleware';
import { Server } from 'http';

type ExpressApp = Express.Express;

type Router = Express.Router;
const Router = Express.Router;

let log = Log.create('rest-server:server');

function StartServer(port: number = 7000): RequestHandler {
    const pathsRecord = {};
    const serverRoutes: Router = Router();
    const app: ExpressApp = Express();
    app.use(BodyParser.json());
    app.use(Compression());
    app.use(CookieParser());
    app.use(context.middleware);
    app.use(headersMiddleware);
    app.use(serverRoutes);
    app.use(pageNotFoundMiddleware(pathsRecord));
    app.use(ErrorHandlerMiddleware);
    const server = app.listen(port, () => {
        log.info(`Server started on port :${port}`);
    });

    return new RequestHandler(server, serverRoutes, pathsRecord);
}

const $id = '$id';

export {
    StartServer,
    $id
};
