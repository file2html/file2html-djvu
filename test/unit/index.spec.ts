import * as fs from 'fs';
import * as path from 'path';
import DjVuReader from '../../src/index';

describe('DjVu', () => {
    describe('#read()', () => {
        let reader: DjVuReader;

        beforeEach(() => {
            reader = new DjVuReader();
        });

        it('should read .djvu file', () => {
            const filename: string = 'sample.djvu';
            const mimeType: string = 'image/vnd.djvu';
            const fileBuffer: Buffer = fs.readFileSync(path.resolve(__dirname, '..', filename));

            return reader.read({
                fileInfo: {
                    content: new Uint8Array(fileBuffer),
                    meta: {
                        name: filename,
                        mimeType
                    } as any
                }
            }).then((file) => {
                const {styles, content} = file.getData();

                expect(styles).toBe('<style></style>');
                expect(content).toBe('<div></div>');
            });
        });
    });
});