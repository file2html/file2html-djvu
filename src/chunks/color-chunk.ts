import {IFFChunk, readIFFChunk} from './iff-chunk';
import ByteStream from '../byte-stream';

export interface ColorChunk extends IFFChunk {
    majorVersion?: number;
    minorVersion?: number;
    grayScale?: number;
    width?: number;
    height?: number;
    delayInit?: number;
    header: {
        serial: number;
        slices: number;
    };
}

export function readColorChunk (byteStream: ByteStream) {
    const colorChunk: ColorChunk = Object.assign({}, readIFFChunk(byteStream), {
        header: {
            serial: byteStream.readUint8(),
            slices: byteStream.readUint8()
        }
    });

    if (!colorChunk.header.serial) {
        this.majorVersion = byteStream.readUint8();
        this.minorVersion = byteStream.readUint8();
        this.grayScale = this.majorVersion >> 7;
        this.width = byteStream.readInt16();
        this.height = byteStream.readInt16();
        this.delayInit = byteStream.readUint8() & 127;
    }

    return colorChunk;
}