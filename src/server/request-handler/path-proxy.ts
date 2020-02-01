type ProxyTargetType = {
    [key: string]: ProxyTargetType,
    (register: (paths: string[], execute: Function) => void): void;
};

function createProxy<T extends ProxyTargetType> (paths: string[], onExcecute: Function): T {
  return new Proxy((<T> new Function()), {
    get<Property extends keyof T >(target: T, property: Property): ProxyTargetType {
      if (property in target) return target[property];
      return createProxy<T>(paths.concat([property.toString()]), onExcecute);
    },
    apply(_: T, __: any,  argArray: T[]): void {
      return onExcecute(paths, argArray[0]);
    }
  });
}

const ProxyPathHandler = {
    create: createProxy
};

export {
    ProxyTargetType,
    ProxyPathHandler
};
