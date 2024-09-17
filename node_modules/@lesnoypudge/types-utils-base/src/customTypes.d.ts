import * as Lib from 'src/libs';



export type Override<
    _Source extends Lib.AnyRecord, 
    _Key extends keyof Source,
    _NewValue,
> = {
    [K in keyof Source]: K extends Key ? NewValue : Source[K];
};

export type SimplifyDeep<_Source> = { 
    [KeyType in keyof _Source]: (
        _Source[KeyType] extends object 
            ? SimplifyDeep<_Source[KeyType]> 
            : _Source[KeyType]
    );
} & {};

export type StrictOmit<
    _ObjectType, 
    _KeysType extends keyof ObjectType
> = Lib.Except<_ObjectType, _KeysType, {requireExactProps: true}>;

export type NonEmptyArray<_Type> = [_Type, ..._Type[]];

export type AnyFunction<
    _Args = any[], 
    _Return = any
> = (...args: _Args) => _Return;