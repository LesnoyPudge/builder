import { T } from "./namespace";

type some = T.UnknownRecord

const some = (data: string) => {
    return data;
}

const construct = <
    _Fn extends T.AnyFunction
>(
    fn: _Fn, 
    ...args: Parameters<_Fn>
): ReturnType<_Fn> => {
    return fn(...args)
}

const qwe = construct(some, '')