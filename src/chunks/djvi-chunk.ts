import ByteStream from '../byte-stream';
import JB2Dict from '../jb2-codec/jb2-dict';
import {IFFChunk, readIFFChunk} from './iff-chunk';

export interface DjViChunk extends IFFChunk {
    id: string;
    length: number;
    chunk?: JB2Dict;
}

export function readDjViChunk (byteStream: ByteStream): DjViChunk {
    const djviChunk: DjViChunk = readIFFChunk(byteStream);

    djviChunk.id += byteStream.readStr4();

    while (!byteStream.isEmpty()) {
        const chunkId: string = byteStream.readStr4();
        const chunkLength: number = byteStream.readInt32();

        byteStream.moveOffset(-8);

        if (chunkId === 'Djbz') {
            djviChunk.chunk = new JB2Dict(byteStream.fork(chunkLength + 8));
        }

        byteStream.moveOffset(8 + chunkLength + (chunkLength & 1 ? 1 : 0));
    }

    return djviChunk;
}
