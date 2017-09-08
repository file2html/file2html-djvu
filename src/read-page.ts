import ByteStream from './byte-stream';
import {SharedData} from './index';
import {InfoChunk, readInfoChunk} from './chunks/info-chunk';
import {IFFChunk, readIFFChunk} from './chunks/iff-chunk';
import JB2Dict from './jb2-codec/jb2-dict';
import {ColorChunk, readColorChunk} from './chunks/color-chunk';

export function readPage (byteStream: ByteStream, sharedData?: SharedData): string {
    const info: InfoChunk = readInfoChunk(byteStream.fork(18));
    const infoChunks: IFFChunk[] = [info];
    const chunks: IFFChunk[] = [];
    const dependencies: string[] = [];
    let fg44: ColorChunk;
    let bg44: ColorChunk;
    let sjbz: JB2Image;
    let incl: INCLChunk;
    let djbz: JB2Dict;
    let fgbz: DjVuPalette;

    byteStream.moveOffset(18);

    while (!byteStream.isEmpty()) {
        let chunk: IFFChunk;
        const chunkId: string = byteStream.readStr4();
        const chunkLength: number = byteStream.readInt32();

        byteStream.moveOffset(-8);

        const chunkByteStream = byteStream.fork(chunkLength + 8);

        byteStream.moveOffset(8 + chunkLength + (chunkLength & 1 ? 1 : 0));

        switch (chunkId) {
            case 'FG44':
                chunk = fg44 = readColorChunk(chunkByteStream);
                break;
            case 'BG44':
                chunk = bg44 = readColorChunk(chunkByteStream);
                break;
            case 'Sjbz':
                chunk = sjbz = readJB2Image(chunkByteStream);
                break;
            case 'Djbz':
                chunk = djbz = readJB2Dict(chunkByteStream);
                break;
            case 'CIDa':
                chunk = readCIDaChunk(chunkByteStream);
                break;
            case 'FGbz':
                chunk = fgbz = readDjVuPalette(chunkByteStream);
                break;
            case 'INCL':
                chunk = incl = readINCLChunk(chunkByteStream);
                const inclChunk: INCLChunk = sharedData && sharedData[incl.ref];

                inclChunk.id === 'Djbz' ? djbz = inclChunk : infoChunks.push(inclChunk);
                dependencies.push((chunk as INCLChunk).ref);
                break;
            default:
                chunk = readIFFChunk(chunkByteStream);
        }

        chunks.push(chunk);
    }

    return '';
}