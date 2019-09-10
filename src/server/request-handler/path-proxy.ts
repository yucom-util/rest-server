type ProxyTargetType = {
    [key: string]: ProxyTargetType,
    (register: (paths: string[], execute: Function) => void): void;
};

const createProxy = <T extends ProxyTargetType, E extends Function> (paths: string[],
                                                                     onExcecute: E): T =>
        new Proxy((<T> new Function()), {
            get: <Property extends keyof T >(target: T,
                                             property: Property,
                                             reciver: any): ProxyTargetType =>
                    property in target ?
                            target[property] :
                            createProxy<T, E>  (paths.concat([property.toString()]),
                                                onExcecute)
            , apply: (  target: T,
                        thisArg: any,
                        argArray: T[]): void => onExcecute(paths, argArray[0])
        });

const ProxyPathHandler = {
    create: createProxy
};

export {
    ProxyTargetType,
    ProxyPathHandler
};
