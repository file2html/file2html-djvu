import {IFFChunk, readIFFChunk} from './iff-chunk';
import ByteStream from '../byte-stream';

export interface InfoChunk extends IFFChunk {
    width: number;
    height: number;
    minorVersion: number;
    majorVersion: number;
    dpi: number;
    gamma: number;
    flag: number;
}

export function readInfoChunk (byteStream: ByteStream): InfoChunk {
    return Object.assign({}, readIFFChunk(byteStream), {
        width: byteStream.readInt16(),
        height: byteStream.readInt16(),
        minver: byteStream.readInt8(),
        majver: byteStream.readInt8(),
        dpi: byteStream.readUint8() | (byteStream.readUint8() << 8),
        gamma: byteStream.readInt8(),
        flag: byteStream.readInt8()
    }) as InfoChunk;
}