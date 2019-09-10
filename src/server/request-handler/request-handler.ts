import logger from '@yucom/log';
import Express from 'express';
import { ProxyPathHandler, ProxyTargetType } from './path-proxy';
import { Server } from 'http';

let serverLog = logger.create('server-app:request-handler');

type Request = Express.Request;
type Response = Express.Response;
type NextFunction = Express.NextFunction;
type ExpressRouter = Express.Router;

type ListHandler = (...params: string[]) => Promise<any[]> | any[];
type GetHandler = (...params: string[]) => any;
type RemoveHandler = (...params: string[]) => any;
type CreateHandler = (body: object, ...params: string[]) => any;
type ReplaceHandler = (body: object, ...params: string[]) => any;
type UpdateHandler = (body: object, ...params: string[]) => any;
type InvokeHandler = (body: object, ...params: string[]) => any;
type InterceptHandler = (next: NextFunction) => any;
type OperationHandler = ListHandler | GetHandler | RemoveHandler | CreateHandler | UpdateHandler | InvokeHandler | InterceptHandler;
type InternalHandler = (body: object, ...params: string[]) => object;
type validOperation = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'use' ;

type RequestContext = {
    request: Request;
    response: Response;
    args: any;
    headers: any;
    cookies: any;
};

type HandlerRegister<T extends OperationHandler> = (paths: string[], handler: T) => any;

interface PathHandler<T extends OperationHandler> extends ProxyTargetType {
    [key: string]: PathHandler<T>;
    (handler: T): void;
}

class RequestHandler {
    public list: PathHandler<ListHandler>;
    public get: PathHandler<GetHandler>;
    public create: PathHandler<CreateHandler>;
    public replace: PathHandler<ReplaceHandler>;
    public update: PathHandler<UpdateHandler>;
    public remove: PathHandler<RemoveHandler>;
    public invoke: PathHandler<InvokeHandler>;
    public intercept: PathHandler<InterceptHandler>;

    constructor(readonly server: Server, private router: ExpressRouter, private pathsRecord: any) {
        this.list = this.initPathHanlder((paths: string[], listHandler: ListHandler) =>
                this.registerHandler(
                        'get',
                        paths,
                        200,
                        async function(body: object, ...params: string[]) {
                            return await listHandler.call(this, ...params);
                        }));

        this.get = this.initPathHanlder((paths: string[], getHandler: GetHandler) =>
                this.registerHandler(
                        'get',
                        paths,
                        200,
                        async function(body: object, ...params: string[]) {
                            return await getHandler.call(this, ...params);
                        }));

        this.create = this.initPathHanlder((paths: string[], createHandler: CreateHandler) =>
                this.registerHandler(
                        'post',
                        paths,
                        201,
                        async function(body: object, ...params: string[]) {
                            return await createHandler.call(this, body, ...params);
                        }));

        this.replace = this.initPathHanlder((paths: string[], replaceHandler: ReplaceHandler) =>
                this.registerHandler(
                        'put',
                        paths,
                        201,
                        async function(body: object, ...params: string[]) {
                            return await replaceHandler.call(this, body, ...params);
                        }));

        this.remove = this.initPathHanlder((paths: string[], removeHandler: RemoveHandler) =>
                this.registerHandler(
                        'delete',
                        paths,
                        204,
                        async function(body: object, ...params: string[]) {
                            return await removeHandler.call(this, ...params);
                        }));

        this.update = this.initPathHanlder((paths: string[], updateHandler: UpdateHandler) =>
                this.registerHandler(
                        'patch',
                        paths,
                        201,
                        async function(body: object, ...params: string[]) {
                            return await updateHandler.call(this, body, ...params);
                        }));

        this.invoke = this.initPathHanlder((paths: string[], invokeHandler: InvokeHandler) =>
                this.registerHandler(
                        'post',
                        paths,
                        200,
                        async function(body: object, ...params: string[]) {
                            return await invokeHandler.call(this, body, ...params);
                        }));

        this.intercept = this.initPathHanlder((paths: string[], interceptHandler: InterceptHandler) =>
                this.registerInterceptor(
                        'use',
                        paths,
                        async function(next: NextFunction) {
                            interceptHandler.call(this, next);
                        }));
    }

    onListening(callback: () => void) {
        this.server.on('listening', callback);
    }

    close(callback?: (err?: Error) => void) {
        this.server.close(callback);
    }

    private getExpressPath = (paths: string[]) => paths.map((p, idx) => p.startsWith('$') ? ':var' + idx : p);
    private getParams = (paths: string[]) => this.getExpressPath(paths).filter(p => p.startsWith(':')).map(p => p.slice(1));
    private getPath = (paths: string[]) => '/' + this.getExpressPath(paths).join('/');
    private getParamsValues = (req: Request, params: string[]) => params.map(param => req.params[param]);
    private getContext = (req: Request, res: Response) => <RequestContext> {
        request: req
        , response: res
        , args: req.query
        , headers: req.headers
        , cookies: req.cookies
    }
    private initPathHanlder = <T extends OperationHandler>(onExecute: HandlerRegister<T>) =>
            ProxyPathHandler.create<PathHandler<T>, HandlerRegister<T>>([], onExecute)

    private recordPath(path: string, method: validOperation) {
        serverLog.debug(`Handler(${method.toUpperCase()}, "${path}")`);
        this.pathsRecord[path] = this.pathsRecord[path] === undefined ? [] : this.pathsRecord[path];
        this.pathsRecord[path].push(method);
    }
    private registerHandler = ( method: validOperation,
                                paths: string[],
                                successfulStatus: number,
                                handler: InternalHandler) => {
        const expressPath = this.getPath(paths);
        const params = this.getParams(paths);
        this.recordPath(expressPath, method);

        this.router[method](expressPath, (req: Request, res: Response, next: NextFunction) => {
            handler.call(this.getContext(req, res), req.body, ...this.getParamsValues(req, params))
                .then((result: any) => {
                    serverLog.info(
                            `Request(path="${req.originalUrl}", body=${JSON.stringify(req.body)}) => ` +
                            `Response(status=${successfulStatus}, body=${JSON.stringify(result)})`);

                    res.status(successfulStatus).json({ data: result });
                })
                .catch(next);
        });
    }

    private registerInterceptor = ( method: validOperation,
                                    paths: string[],
                                    handler: InterceptHandler) => {
        const expressPath = this.getPath(paths);
        serverLog.debug(`Inteceptor("${expressPath}")`);

        this.router[method](expressPath, (req: Request, res: Response, next: NextFunction) =>
                handler.call(this.getContext(req, res), next).catch(next)
        );
    }
}

export {
    RequestHandler
};
