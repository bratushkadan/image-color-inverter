import process from 'process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import sharp from 'sharp';

const readdir = promisify(fs.readdir);

let [pth, absPath] = process.argv.slice(2);
let imagesPath = '';
if (pth !== "null") {
    if (pth.startsWith('/home/')) {
        imagesPath = pth;
    } else {
        imagesPath = path.join(absPath, pth);
    }
} else {
    imagesPath = absPath;
}

const sharpFilename = filename => sharp(path.join(imagesPath, filename));
const joinImgPath = img => path.join(imagesPath, img);

(async () => {
    try {
        const fileDir = await readdir(imagesPath);
        const imgBuffers = {};
        for (let file of fileDir) {
            imgBuffers[file] = sharpFilename(file)
            .negate({
                alpha: false
            })
            .toBuffer()
            .then(buffer => ({filename: file, buffer}));
        }
        const buffers = await Promise.all(Object.values(imgBuffers));
        for (let {filename, buffer} of buffers) {
            fs.writeFile(joinImgPath(filename), buffer, err => {
                if (err) {
                    console.log(err);
                }
            });
        }
    } catch (err) {
        throw new Error(`Path ${imagesPath} does not exist.`)
    }
})();