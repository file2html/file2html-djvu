import * as file2html from 'file2html';
import {errorsNamespace} from 'file2html/lib/errors';
import * as mime from 'file2html/lib/mime';
import ByteStream from './byte-stream';
import {DIRMChunk, readDIRMChunk} from './chunks/dirm-chunk';
import {NAVMChunk, readNAVMChunk} from './chunks/navm-chunk';
import {readDjViChunk} from './chunks/djvi-chunk';
import {readPage} from './read-page';
import {IFFChunk} from './chunks/iff-chunk';

const supportedMimeTypes: string[] = [mime.lookup('.djvu')];

export interface SharedData {
    [key: string]: IFFChunk;
}

export default class DjVuReader extends file2html.Reader {
    read ({fileInfo}: file2html.ReaderParams) {
        const {byteLength, buffer} = fileInfo.content;
        const byteStream: ByteStream = new ByteStream(buffer, 0, byteLength);
        const formatId: string = byteStream.readStr4();

        if (formatId !== 'AT&T') {
            return Promise.reject(new Error(`${ errorsNamespace }.invalidFileFormat. FormatId: ${ formatId }`)) as any;
        }

        return new Promise((resolve) => {
            let chunkId: string = byteStream.readStr4();
            const firstChunkSize: number = byteStream.readInt32();
            let nvmChunk: NAVMChunk;
            let content: string = '';

            chunkId += byteStream.readStr4();

            if (chunkId === 'FORMDJVM') {
                const sharedData: SharedData = {};

                byteStream.readStr4();
                const dirmChunkSize: number = byteStream.readInt32();

                byteStream.moveOffset(-8);

                const dirmChunk: DIRMChunk = readDIRMChunk(byteStream.fork(dirmChunkSize + 8));

                byteStream.moveOffset(8 + dirmChunkSize + (dirmChunkSize & 1 ? 1 : 0));

                const chunkId: string = byteStream.readStr4();
                const chunkSize: number = byteStream.readInt32();

                byteStream.moveOffset(-8);

                if (chunkId === 'NAVM') {
                    nvmChunk = readNAVMChunk(byteStream.fork(chunkSize + 8));
                }

                const {nfiles, offsets, ids} = dirmChunk;

                for (let i = 0; i < nfiles; i++) {
                    byteStream.offset = offsets[i];

                    let chunkId: string = byteStream.readStr4();
                    const chunkLength: number = byteStream.readInt32();

                    chunkId += byteStream.readStr4();
                    byteStream.moveOffset(-12);

                    switch (chunkId) {
                        case 'FORMDJVU':
                            content += readPage(byteStream.fork(chunkLength + 8), sharedData);
                            break;
                        case 'FORMDJVI':
                            sharedData[ids[i]] = readDjViChunk(byteStream.fork(length + 8));
                            break;
                        default:
                        //
                    }
                }
            } else {
                byteStream.moveOffset(-12);
                content += readPage(byteStream.fork(firstChunkSize + 4));
            }

            resolve(new file2html.File({
                meta: Object.assign({
                    fileType: file2html.FileTypes.document,
                    mimeType: '',
                    name: '',
                    size: byteLength,
                    creator: '',
                    createdAt: '',
                    modifiedAt: ''
                }, fileInfo.meta),
                styles: '<style></style>',
                content: `<div>${ content }</div>`
            }));
        });
    }

    static testFileMimeType (mimeType: string) {
        return supportedMimeTypes.indexOf(mimeType) >= 0;
    }
}