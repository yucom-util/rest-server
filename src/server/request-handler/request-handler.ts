import logger from '@yucom/log';
import Express from 'express';
import { ProxyPathHandler, ProxyTargetType } from './path-proxy';
import { Server } from 'http';

let serverLog = logger.create('server-app:request-handler');

type Request = Express.Request;
type Response = Express.Response;
type NextFunction = Express.NextFunction;
type ExpressRouter = Express.Router;

type ListHandler = (...params: string[]) => (Promise<any[]> | any[]);
type GetHandler = (...params: string[]) => any;
type RemoveHandler = (...params: string[]) => any;
type CreateHandler = (body: object, ...params: string[]) => any;
type ReplaceHandler = (body: object, ...params: string[]) => any;
type UpdateHandler = (body: object, ...params: string[]) => any;
type InvokeHandler = (body: object, ...params: string[]) => any;
type InterceptHandler = (next: NextFunction) => any;
type OperationHandler = ListHandler | GetHandler | RemoveHandler | CreateHandler | UpdateHandler | InvokeHandler | InterceptHandler;
type InternalHandler = (body: object, ...params: string[]) => object;
type validOperation = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'use';

type RequestContext = {
    request: Request;
    response: Response;
    args: any;
    headers: any;
    cookies: any;
};

type HandlerRegister<T extends OperationHandler> = (paths: string[], handler: T | ReturnType<T>) => any;

interface PathHandler<T extends OperationHandler> extends ProxyTargetType {
    [key: string]: PathHandler<T>;
    (handler: T | ReturnType<T>): void;
}

function asHandler<T extends OperationHandler>(handler: T | ReturnType<T>): T {
  if (typeof(handler) === 'function') {
    return handler
  } else {
    return <T>(() => handler)
  }
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
    public static: PathHandler<() => string>;

    private readyPromise: Promise<void> = undefined;
    private server: Server = undefined;

    constructor(readonly express: Express.Express, private router: ExpressRouter, private pathsRecord: any) {

      this.list = this.initPathHanlder((paths: string[], response: ListHandler | any[]) => {
        let handler = asHandler<ListHandler>(response)
        this.registerHandler(
                'get',
                paths,
                200,
                async function(_, ...params: string[]) {
                    return await handler.call(this, ...params);
                })
        }
      );

      this.get = this.initPathHanlder((paths: string[], response: GetHandler | any) => {
        let handler = asHandler(response)
        this.registerHandler(
                'get',
                paths,
                200,
                async function(_, ...params: string[]) {
                    return await handler.call(this, ...params);
                })
      });

      this.create = this.initPathHanlder((paths: string[], response: CreateHandler | any) =>{
        let handler = asHandler(response)
        this.registerHandler(
                'post',
                paths,
                201,
                async function(body: object, ...params: string[]) {
                    return await handler.call(this, body, ...params);
                })
      });

      this.replace = this.initPathHanlder((paths: string[], response: ReplaceHandler | any) => {
        let handler = asHandler(response)
        this.registerHandler(
                'put',
                paths,
                201,
                async function(body: object, ...params: string[]) {
                    return await handler.call(this, body, ...params);
                })
      });

      this.remove = this.initPathHanlder((paths: string[], response: RemoveHandler | any) => {
        let handler = asHandler(response)
        this.registerHandler(
                'delete',
                paths,
                204,
                async function(_, ...params: string[]) {
                    return await handler.call(this, ...params);
                })
      });

      this.update = this.initPathHanlder((paths: string[], response: UpdateHandler | any) =>{
        let handler = asHandler(response)
        this.registerHandler(
                'patch',
                paths,
                201,
                async function(body: object, ...params: string[]) {
                    return await handler.call(this, body, ...params);
                })
      });

      this.invoke = this.initPathHanlder((paths: string[], response: InvokeHandler | any) =>{
        let handler = asHandler(response)
        this.registerHandler(
              'post',
              paths,
              200,
              async function(body: object, ...params: string[]) {
                  return await handler.call(this, body, ...params);
              })
      });

      this.intercept = this.initPathHanlder((paths: string[], handler: InterceptHandler) =>
        this.registerInterceptor(
              'use',
              paths,
              async function(next: NextFunction) {
                handler.call(this, next);
              }));

      this.static = this.initPathHanlder((paths: string[], rootFolder: string) => {
        const expressPath = this.getPath(paths);
        serverLog.debug(`Static("${expressPath}")`);

        router.use(
          expressPath,
          Express.static(rootFolder, { fallthrough: false, extensions: ['html', 'htm'] })
        );
      });
    }

    ready() {
      return this.readyPromise || Promise.reject(new Error('Server not started. Use listen.'));
    }

    close() {
      return new Promise<void>((resolve, reject) => {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    listen(port: number = 7000) {
      if (this.server) return Promise.reject(new Error('Cannot restart a server. Not supported.'));
      this.readyPromise = new Promise(resolve => {
        this.server = this.express.listen(port, resolve);
      });
      return this.readyPromise;
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
    private initPathHanlder = <T extends OperationHandler>(onExecute: Function) =>
            ProxyPathHandler.create<PathHandler<T>>([], onExecute)

    private recordPath(path: string, method: validOperation) {
        serverLog.debug(`Handler(${method.toUpperCase()}, "${path}")`);
        this.pathsRecord[path] = this.pathsRecord[path] === undefined ? [] : this.pathsRecord[path];
        this.pathsRecord[path].push(method);
    }
    private registerHandler(method: validOperation,
                            paths: string[],
                            successfulStatus: number,
                            handler: InternalHandler) {
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

    private registerInterceptor(method: validOperation,
                                paths: string[],
                                handler: InterceptHandler) {
        const expressPath = this.getPath(paths);
        serverLog.debug(`Inteceptor("${expressPath}")`);

        this.router[method](expressPath, (req: Request, res: Response, next: NextFunction) =>
          handler.call(this.getContext(req, res), next).catch(next)
        );
    }

    private registerStatic(paths: string[], localPath: string) {
        const expressPath = this.getPath(paths);
        serverLog.debug(`Static("${expressPath}")`);

        this.router.use(
          expressPath,
          Express.static(localPath, { fallthrough: false, extensions: ['html', 'htm'] })
        );
    }
}

export {
    RequestHandler
};
