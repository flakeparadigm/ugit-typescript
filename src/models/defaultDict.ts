type Obj<V> = {
    [key: string]: V
};

/**
 * A datastructure similar to Python's DefaultDict. It uses a callback function
 * to generate the default value when a given index is used for the first time.
 *
 * The default value is stored immediately upon generation, so...
 *  - The object returned can be mutated without needing to store it back
 *      manually back into the dict. For example, if the default value is an
 *      array, you can do `myDict['someKey'].push('newValue')` safely.
 *  - Unnecesary/excessive accesses to unique keys could lead to an unexpected
 *      increase in memory usage.
 */
export default class DefaultDict<V> {
    /**
     * @param defaultGen a function used to generate the default value for a new
     *                   entry that has not been seen before.
     */
    constructor(defaultGen: (name: string) => V) {
        return new Proxy({} as Obj<V>, {
            get(target: Obj<V>, name) {
                const nameStr = name.toString();

                if (!(name in target)) {
                    const val = defaultGen.call(this, nameStr);
                    target[nameStr] = val; // eslint-disable-line
                }

                return target[nameStr];
            },
        });
    }

    [key: string]: V
}
