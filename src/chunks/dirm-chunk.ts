import {IFFChunk, readIFFChunk} from './iff-chunk';
import decodeBZZByteStream from '../bzz-decoder/decode-bzz-byte-stream';
import ByteStream from '../byte-stream';

export interface DIRMChunk extends IFFChunk {
    dflags: number;
    nfiles: number;
    offsets: number[];
    sizes: number[];
    flags: number[];
    ids: string[];
    names: string[];
    titles: string[];
}

export function readDIRMChunk (byteStream: ByteStream): DIRMChunk {
    const dirmChunk: DIRMChunk = Object.assign({}, readIFFChunk(byteStream), {
        dflags: byteStream.readByte(),
        nfiles: byteStream.readInt16(),
        offsets: [],
        sizes: [],
        flags: [],
        ids: [],
        names: [],
        titles: []
    });

    const {nfiles} = dirmChunk;

    for (let i = 0; i < nfiles; i++) {
        dirmChunk.offsets[i] = byteStream.readInt32();
    }

    const bzzByteStream: ByteStream = decodeBZZByteStream(byteStream.fork(dirmChunk.length - 3 - 4 * nfiles));

    for (let i = 0; i < nfiles; i++) {
        dirmChunk.sizes[i] = bzzByteStream.readUint24();
    }

    for (let i = 0; i < nfiles; i++) {
        dirmChunk.flags[i] = bzzByteStream.readByte();
    }

    for (let i = 0; i < nfiles && !bzzByteStream.isEmpty(); i++) {
        const id: string = bzzByteStream.readStrNT();
        const flag: number = dirmChunk.flags[i];

        dirmChunk.ids[i] = id;
        dirmChunk.names[i] = flag & 128 ? bzzByteStream.readStrNT() : id;
        dirmChunk.titles[i] = flag & 64 ? bzzByteStream.readStrNT() : id;
    }

    return dirmChunk;
}