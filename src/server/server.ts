import context from '@yucom/context';
import Log from '@yucom/log';
import Express from 'express';
import BodyParser from 'body-parser';
import CookieParser from 'cookie-parser';
import Compression from 'compression';
import { RequestHandler } from './request-handler/request-handler';
import { ErrorHandlerMiddleware } from './middleware/error-handler.middleware';
import { headersMiddleware, pageNotFoundMiddleware } from './middleware/common.middleware';
import Cors from 'cors';

type Options = {
  corsAllowedOrigins?: any;
};

const Router = Express.Router;

let log = Log.create('rest-server:server');

const defaultOptions = {
  corsAllowedOrigins: '*'
};

function CreateServer(options?: Options): RequestHandler {

    options = { ...defaultOptions, ...options };

    const pathsRecord = {};
    const serverRoutes = Router();
    const app = Express();

    app.use(
      Cors({
        origin: options.corsAllowedOrigins,
        optionsSuccessStatus: 200,
        allowedHeaders: '*'
      }
    ));

    app.use(BodyParser.json());
    app.use(Compression());
    app.use(CookieParser());
    app.use(context.middleware);
    app.use(headersMiddleware);
    app.use(serverRoutes);
    app.use(pageNotFoundMiddleware(pathsRecord));
    app.use(ErrorHandlerMiddleware);

    log.info('Server created. Use listen to start.');
    return new RequestHandler(app, serverRoutes, pathsRecord);
}

const $id = '$id';

export {
    CreateServer,
    $id
};
