import ByteStream from '../byte-stream';
import downBytes from './down-bytes';
import mBytes from './m-bytes';
import pTypes from './p-bytes';
import upBytes from './up-bytes';

export default class ZPDecoder {
    private byteStream: ByteStream;
    private a: number;
    private c: number;
    private z: number;
    private d: number;
    private f: number;
    private ffzt: Int8Array;
    private delay: number;
    private scount: number;
    private buffer: number;
    private b: number;

    constructor (byteStream: ByteStream) {
        this.byteStream = byteStream;
        this.a = 0x0000;
        this.c = (byteStream.readByte() << 8) | byteStream.readByte();
        this.z = 0;
        this.d = 0;
        this.f = Math.min(this.c, 0x7fff);
        this.ffzt = new Int8Array(256);
        
        for (let i = 0; i < 256; i++) {
            this.ffzt[i] = 0;

            for (let j = i; j & 0x80; j <<= 1) {
                this.ffzt[i] += 1;
            }
        }
        
        this.delay = 25;
        this.scount = 0;
        this.buffer = 0;
        this.preload();
    }

    preload () {
        while (this.scount <= 24) {
            this.buffer = (this.buffer << 8) | this.byteStream.readByte();
            this.scount += 8;
        }
    }

    ffz (x: number) {
        return (x >= 0xff00) ? (this.ffzt[x & 0xff] + 8) : (this.ffzt[(x >> 8) & 0xff]);
    }

    decode (ctx?: Uint8Array, n?: number): number {
        if (!ctx) {
            return this.ptdecode(0x8000 + (this.a >> 1));
        }
        
        this.b = ctx[n] & 1;
        this.z = this.a + pTypes[ctx[n]];

        if (this.z <= this.f) {
            this.a = this.z;
            return this.b;
        }

        this.d = 0x6000 + ((this.a + this.z) >> 2);

        if (this.z > this.d) {
            this.z = this.d;
        }

        if (this.z > this.c) {
            this.b = 1 - this.b;
            this.z = 0x10000 - this.z;
            this.a += this.z;
            this.c += this.z;
            ctx[n] = downBytes[ctx[n]];

            const shift: number = this.ffz(this.a);

            this.scount -= shift;
            this.a = 0xffff & (this.a << shift);
            this.c = 0xffff & ((this.c << shift) | (this.buffer >> this.scount) & ((1 << shift) - 1));
        } else {
            if (this.a >= mBytes[ctx[n]]) {
                ctx[n] = upBytes[ctx[n]];
            }

            this.scount--;
            this.a = 0xffff & (this.z << 1);
            this.c = 0xffff & ((this.c << 1) | ((this.buffer >> this.scount) & 1));
        }

        if (this.scount < 16) {
            this.preload();
        }

        this.f = Math.min(this.c, 0x7fff);

        return this.b;
    }

    decodeIW (): number {
        return this.ptdecode(0x8000 + ((this.a + this.a + this.a) >> 3));
    }

     private ptdecode (z: number): number {
        this.b = 0;

        if (z > this.c) {
            this.b = 1;
            z = 0x10000 - z;
            this.a += z;
            this.c += z;

            const shift: number = this.ffz(this.a);

            this.scount -= shift;
            this.a = 0xffff & (this.a << shift);
            this.c = 0xffff & ((this.c << shift) | (this.buffer >> this.scount) & ((1 << shift) - 1));
        } else {
            this.b = 0;
            this.scount--;
            this.a = 0xffff & (z << 1);
            this.c = 0xffff & ((this.c << 1) | ((this.buffer >> this.scount) & 1));
        }

        if (this.scount < 16) {
            this.preload();
        }

        this.f = Math.min(this.c, 0x7fff);

        return this.b;
    }
}