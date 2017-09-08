import ByteStream from '../byte-stream';

export interface IFFChunk {
    id: string;
    length: number;
}

export function readIFFChunk (byteStream: ByteStream): IFFChunk {
    return {
        id: byteStream.readStr4(),
        length: byteStream.readInt32()
    };
}