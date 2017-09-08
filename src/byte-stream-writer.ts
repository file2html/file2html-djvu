export default class ByteStreamWriter {
    private growStep: number;
    private offset: number;
    private buffer: ArrayBuffer;
    private viewer: DataView;

    constructor (length?: number) {
        this.growStep = length || 4096;
        this.buffer = new ArrayBuffer(this.growStep);
        this.viewer = new DataView(this.buffer);
        this.offset = 0;
    }

    getBuffer (): ArrayBuffer {
        if (this.offset === this.buffer.byteLength) {
            return this.buffer;
        }

        return this.buffer.slice(0, this.offset);
    }

    checkOffset (bytes?: number): boolean {
        bytes = bytes || 0;

        const needToExtense: boolean = this.offset + bytes >= this.buffer.byteLength;

        if (needToExtense) {
            this.extense();
        }

        return needToExtense;
    }

    extense () {
        const bufferLength = this.buffer.byteLength * 2;
        const buffer: ArrayBuffer = new ArrayBuffer(bufferLength);

        new Uint8Array(buffer).set(new Uint8Array(this.buffer)); // fast copy of ArrayBuffer
        this.buffer = buffer;
        this.viewer = new DataView(this.buffer);
    }

    writeArray (arr: Uint8Array) {
        while (this.checkOffset(arr.length - 1)) {
            //
        }
        new Uint8Array(this.buffer).set(arr, this.offset); // fast copy of ArrayBuffer
        this.offset += arr.length;
    }
}
