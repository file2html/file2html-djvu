import ByteStream from '../byte-stream';
import BZZDecoder from './index';
import ZPDecoder from '../zp-codec/zp-decoder';

export default function decodeBZZByteStream (byteStream: ByteStream): ByteStream {
    return new BZZDecoder(new ZPDecoder(byteStream)).getByteStream();
}