import {errorsNamespace} from 'file2html/lib/errors';
import ZPDecoder from '../zp-codec/zp-decoder';
import ByteStream from '../byte-stream';
import ByteStreamWriter from '../byte-stream-writer';

const corruptedByteStreamError: string = `${ errorsNamespace }.CorruptedByteStream`;
const bigBlockError: string = `${ errorsNamespace }.TooBigBlockToDecode`;

export default class BZZDecoder {
    private zpDecoder: ZPDecoder;
    private readonly maxBlock: number = 4096;
    private readonly maxFreq: number = 4;
    private readonly ctxIds: number = 3;
    private mtf: Uint8Array;
    private ctx: Uint8Array;
    private data: Uint8Array;
    private size: number;
    private blocksize: number;

    constructor (zpDecoder: ZPDecoder) {
        this.zpDecoder = zpDecoder;
        this.mtf = new Uint8Array(256);

        for (let i = 0; i < 256; i++) {
            this.mtf[i] = i;
        }

        this.ctx = new Uint8Array(300);
        this.size = 0;
        this.blocksize = 0;
    }

    private decode (): number {
        const {zpDecoder, ctxIds, ctx} = this;

        this.size = this.decodeRaw(24);

        if (!this.size) {
            return 0;
        }

        if (this.size > this.maxBlock * 1024) {
            throw new Error(bigBlockError);
        }

        // Allocate
        if (this.blocksize < this.size) {
            this.blocksize = this.size;
            this.data = new Uint8Array(this.blocksize);
        } else if (!this.data) {
            this.data = new Uint8Array(this.blocksize);
        }

        // Decode Estimation Speed
        let fShift: number = 0;

        if (zpDecoder.decode()) {
            fShift++;

            if (zpDecoder.decode()) {
                fShift++;
            }
        }

        const freq: number[] = new Array(this.maxFreq);

        for (let i = 0; i < this.maxFreq; i++) {
            freq[i] = 0;
        }

        let fadd: number = 4;

        // Decode
        let mtfNo: number = 3;
        let markerPos: number = -1;

        for (let i = 0; i < this.size; i++) {
            let ctxId: number = ctxIds - 1;

            if (ctxId > mtfNo) {
                ctxId = mtfNo;
            }

            let ctxOff: number = 0;

            switch (1) {
                default: {
                    if (zpDecoder.decode(ctx, ctxOff + ctxId) !== 0) {
                        mtfNo = 0;
                        this.data[i] = this.mtf[mtfNo];
                        break;
                    }

                    ctxOff += ctxIds;

                    if (zpDecoder.decode(ctx, ctxOff + ctxId) !== 0) {
                        mtfNo = 1;
                        this.data[i] = this.mtf[mtfNo];
                        break;
                    }

                    ctxOff += ctxIds;

                    if (zpDecoder.decode(ctx, ctxOff) !== 0) {
                        mtfNo = 2 + this.decodeBinary(ctxOff + 1, 1);
                        this.data[i] = this.mtf[mtfNo];
                        break;
                    }

                    ctxOff += 2;

                    if (zpDecoder.decode(ctx, ctxOff) !== 0) {
                        mtfNo = 4 + this.decodeBinary(ctxOff + 1, 2);
                        this.data[i] = this.mtf[mtfNo];
                        break;
                    }

                    ctxOff += 4;

                    if (zpDecoder.decode(ctx, ctxOff) !== 0) {
                        mtfNo = 8 + this.decodeBinary(ctxOff + 1, 3);
                        this.data[i] = this.mtf[mtfNo];
                        break;
                    }

                    ctxOff += 8;

                    if (zpDecoder.decode(ctx, ctxOff) !== 0) {
                        mtfNo = 16 + this.decodeBinary(ctxOff + 1, 4);
                        this.data[i] = this.mtf[mtfNo];
                        break;
                    }

                    ctxOff += 16;

                    if (zpDecoder.decode(ctx, ctxOff) !== 0) {
                        mtfNo = 32 + this.decodeBinary(ctxOff + 1, 5);
                        this.data[i] = this.mtf[mtfNo];
                        break;
                    }

                    ctxOff += 32;

                    if (zpDecoder.decode(ctx, ctxOff) !== 0) {
                        mtfNo = 64 + this.decodeBinary(ctxOff + 1, 6);
                        this.data[i] = this.mtf[mtfNo];
                        break;
                    }

                    ctxOff += 64;

                    if (zpDecoder.decode(ctx, ctxOff) !== 0) {
                        mtfNo = 128 + this.decodeBinary(ctxOff + 1, 7);
                        this.data[i] = this.mtf[mtfNo];
                        break;
                    }

                    mtfNo = 256;
                    this.data[i] = 0;
                    markerPos = i;
                    continue;
                }
            }

            let k: number;

            fadd = fadd + (fadd >> fShift);

            if (fadd > 0x10000000) {
                fadd >>= 24;
                freq[0] >>= 24;
                freq[1] >>= 24;
                freq[2] >>= 24;
                freq[3] >>= 24;

                for (k = 4; k < this.maxFreq; k++) {
                    freq[k] >>= 24;
                }
            }

            // Relocate new char according to new freq
            let fc: number = fadd;

            if (mtfNo < this.maxFreq) {
                fc += freq[mtfNo];
            }

            for (k = mtfNo; k >= this.maxFreq; k--) {
                this.mtf[k] = this.mtf[k - 1];
            }

            for (; (k > 0) && ((0xffffffff & fc) >= (0xffffffff & freq[k - 1])); k--) {
                this.mtf[k] = this.mtf[k - 1];
                freq[k] = freq[k - 1];
            }

            this.mtf[k] = this.data[i];
            freq[k] = fc;
        }

        // Reconstruct the string
        if ((markerPos < 1) || (markerPos >= this.size)) {
            throw new Error(corruptedByteStreamError);
        }

        const positions: Uint32Array = new Uint32Array(this.size);

        for (let j = 0; j < this.size; j++) {
            positions[j] = 0;
        }

        // Prepare count buffer
        const count: number[] = new Array(256);

        for (let i = 0; i < 256; i++) {
            count[i] = 0;
        }

        // Fill count buffer
        for (let i = 0; i < markerPos; i++) {
            const c: number = this.data[i];

            positions[i] = (c << 24) | (count[0xff & c] & 0xffffff);
            count[0xff & c]++;
        }

        for (let i = markerPos + 1; i < this.size; i++) {
            const c: number = this.data[i];

            positions[i] = (c << 24) | (count[0xff & c] & 0xffffff);
            count[0xff & c]++;
        }

        // Compute sorted char positions
        let last: number = 1;

        for (let i = 0; i < 256; i++) {
            const tmp: number = count[i];

            count[i] = last;
            last += tmp;
        }

        // Undo the sort transform
        let j: number = 0;

        last = this.size - 1;

        while (last > 0) {
            const pos1: number = positions[j];
            const pos2: number = positions[j] >> 24;

            this.data[--last] = 0xff & pos2;
            j = count[0xff & pos2] + (pos1 & 0xffffff);
        }

        // Free and check
        if (j !== markerPos) {
            throw new Error(corruptedByteStreamError);
        }

        return this.size;
    }

    decodeRaw (bits: number) {
        let n: number = 1;
        const m: number = (1 << bits);

        while (n < m) {
            n = (n << 1) | this.zpDecoder.decode();
        }

        return n - m;
    }

    decodeBinary (ctxOff: number, bits: number) {
        let n: number = 1;
        const m: number = 1 << bits;

        ctxOff--;

        while (n < m) {
            const b: number = this.zpDecoder.decode(this.ctx, ctxOff + n);

            n = (n << 1) | b;
        }

        return n - m;
    }

    getByteStream (): ByteStream {
        let size: number;
        let byteStreamWriter: ByteStreamWriter;

        while (size = this.decode()) {
            if (!byteStreamWriter) {
                byteStreamWriter = new ByteStreamWriter(size - 1);
                byteStreamWriter.writeArray(new Uint8Array(this.data.buffer, 0, this.data.length - 1));
            }
        }

        this.data = undefined;

        return new ByteStream(byteStreamWriter.getBuffer());
    }
}