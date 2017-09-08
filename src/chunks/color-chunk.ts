import {IFFChunk, readIFFChunk} from './iff-chunk';
import ByteStream from '../byte-stream';

export interface ColorChunk extends IFFChunk {
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

    }

    return colorChunk;
}