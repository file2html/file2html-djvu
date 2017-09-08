import {IFFChunk, readIFFChunk} from './iff-chunk';
import ByteStream from '../byte-stream';

export interface NAVMChunk extends IFFChunk {
}

export const readNAVMChunk: (byteStream: ByteStream) => NAVMChunk = readIFFChunk;