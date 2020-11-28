import { Readable, ReadableOptions } from 'stream';

/**
 * A Readable class that allows reading from an array of buffers through the
 * Node streaming interfaces.
 */
export default class ReadableBufferArray extends Readable {
    private readonly buffs: Buffer[];

    private current = 0;

    /**
     * @param buffs An array of buffers to make readable
     * @param options https://nodejs.org/docs/latest-v12.x/api/stream.html#stream_new_stream_readable_options
     */
    constructor(buffs: Buffer[], options: ReadableOptions = {}) {
        super(options);

        // make a new array to prevent weirdness if the original array is edited
        this.buffs = [...buffs];
    }

    public _read(): void { // eslint-disable-line no-underscore-dangle
        if (this.current >= this.buffs.length) this.push(null);

        this.push(this.buffs[this.current]);
        this.current += 1;
    }
}
