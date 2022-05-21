import path from 'path';
import type fs from 'fs';
import { readdir, writeFile } from 'fs/promises';
import sharp from 'sharp';
import minimist from 'minimist';

// todo: implement --recursive

const AVAILABLE_IMG_EXTENSIONS = ['.png', '.jpeg', '.jpg', '.webp'];

const argv = minimist(process.argv.slice(2), { string: '_' });
const filePaths = argv._;
const dirPath = argv.p && argv.path;

main();

async function main() {
  const dirPath = resolvePathArgument(argv.p) || resolvePathArgument(argv.path);
  // const isRecursive = argv.r === true ?? argv.recursive === true;

  if (!dirPath && !argv._.length) {
    throw new Error('Image Color Inverter: No directory name or file paths provided.');
  }

  // const files = Array.from(new Set(argv._));

  if (dirPath) {
    await processDir(dirPath);
  }
}

async function processDir(dir: string) {
  let dirents: fs.Dirent[];
  try {
    dirents = await readdir(dir, { withFileTypes: true });

    const images = dirents
      .filter((dirent) => dirent.isFile() && AVAILABLE_IMG_EXTENSIONS.includes(path.extname(dirent.name)))
      .map((dirent) => path.resolve(path.join(dir, dirent.name)));

    console.log(images)

    const imgBuffers: Record<string, Promise<{ filename: string; buffer: Buffer }>> = {};
    for (const filename of images) {
      imgBuffers[filename] = sharp(filename)
        .negate({ alpha: false })
        .toBuffer()
        .then((buffer) => ({ filename, buffer }));
    }

    const buffers: { filename: string; buffer: Buffer }[] = await Promise.all(Object.values(imgBuffers));

    for (const { filename, buffer } of buffers) {
      writeFile(filename, buffer);
    }
  } catch (err) {
    if (err instanceof Error) {
      if (err.code === 'ENOENT') {
        throw new Error(`No such directory '${dir}'.`);
      }

      if (err.code === 'ENOTDIR') {
        throw new Error(`Not a direcƒtory '${dir}'.`);
      }

      throw err;
    }
  }

  return;
}

// async function* getDirectoryFiles(
//   dir: string,
//   options?: Partial<{ isRecursive?: boolean; ignoreExts: string[] }>
// ): AsyncGenerator<string, void, void> {
//   return [];
// }

// async function* getDirectoryFilesRecursively(dir: string, baseDir: string = dir): AsyncGenerator<string, void, void> {
//   const dirents = await readdir(dir, {withFileTypes: true})
//   for (const dirent of dirents) {
//     const res = path.join(dir, dirent.name)

//     if (dirent.isDirectory()) {
//       yield* getDirectoryFilesRecursively(res, baseDir)
//     } else if (!IGNORED_EXTS.includes(path.extname(res))) {
//       yield res
//     }
//   }
// }

// TypeScript error: A function whose declared type is neither 'void' nor 'any' must return a value.
function resolvePathArgument(arg: unknown): string | undefined {
  if (typeof arg === 'string') {
    return path.resolve(arg);
  }
}

declare global {
  export interface Error {
    errno: number;
    code: string;
    syscall: string;
    path: string;
  }
}
