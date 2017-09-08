export default class ByteStream {
    offset: number;
    offsetX: number;
    length: number;
    viewer: DataView;

    constructor (buffer: ArrayBuffer, offsetX?: number, length?: number) {
        this.offsetX = offsetX || 0;
        this.offset = 0;
        this.length = length || buffer.byteLength;
        this.viewer = new DataView(buffer, this.offsetX, this.length);
    }

    moveOffset (offset: number) {
        this.offset += offset;
    }

    fork (length: number): ByteStream {
        const {offset} = this;

        return new ByteStream(this.viewer.buffer, this.offsetX + offset, length || (this.length - offset));
    }

    isEmpty (): boolean {
        return this.offset >= this.length;
    }

    readByte (): number {
        if (this.isEmpty()) {
            this.offset++;
            return 0xff;
        }

        return this.viewer.getUint8(this.offset++);
    }

    readInt8 (): number {
        return this.viewer.getInt8(this.offset++);
    }

    readUint8 (): number {
        return this.viewer.getUint8(this.offset++);
    }

    readInt16 (): number {
        const result: number = this.viewer.getInt16(this.offset);

        this.offset += 2;

        return result;
    }

    readInt32 (): number {
        const result: number = this.viewer.getInt32(this.offset);

        this.offset += 4;

        return result;
    }

    readStr4 (): string {
        const bytes: number[] = [];
        const {viewer} = this;

        for (let i = 0; i < 4; i++) {
            bytes[i] = viewer.getUint8(this.offset++);
        }

        return String.fromCharCode.apply(String, bytes);
    }

    readStrNT() {
        const bytes: number[] = [];
        let byte: number = this.viewer.getUint8(this.offset++);

        while (byte) {
            bytes.push(byte);
            byte = this.viewer.getUint8(this.offset++);
        }

        return String.fromCharCode.apply(String, bytes);
    }

    readUint24(): number {
        return (this.readByte() << 16) | (this.readByte() << 8) | this.readByte();
    }
}