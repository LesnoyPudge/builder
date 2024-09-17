interface Array<T> {
    reduce<U>(
        callbackfn: (
            previousValue: U, 
            currentValue: T, 
            currentIndex: number, 
            array: T[]
        ) => U, 
        initialValue: Partial<U>
    ): U;

    includes(
        searchElement: unknown,
        fromIndex?: number,
    ): boolean;
}

interface ReadonlyArray<T> {
    reduce<U>(
        callbackfn: (
            previousValue: U, 
            currentValue: T, 
            currentIndex: number, 
            array: T[]
        ) => U, 
        initialValue: Partial<U>
    ): U;

    includes(
        searchElement: unknown,
        fromIndex?: number,
    ): boolean;
}