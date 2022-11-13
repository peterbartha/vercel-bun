import { AsyncUnzipInflate, Unzip } from 'fflate';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type UnzippedFile = {
  name: string;
  bytes: number;
};

type UnzipResponse = {
  files: UnzippedFile[];
  totalBytes: number;
};

/**
 * Asynchronously extract a ZIP archive using Node.js's built-in streams.
 * @param readableStream The readable stream of the input archive.
 * @param outputDir The output directory to extract the given archive file.
 * @returns The extracted file(s).
 */
export async function unzip(
  readableStream: NodeJS.ReadableStream,
  outputDir: string,
): Promise<UnzipResponse> {
  await fs.mkdir(outputDir, { recursive: true });

  const extractResult: UnzipResponse = {
    files: [],
    totalBytes: 0,
  };
  await new Promise<void>((resolve, reject) => {
    const promises: Promise<void>[] = [];
    const unzip = new Unzip();
    unzip.register(AsyncUnzipInflate);
    unzip.onfile = fileStream => {
      if (fileStream.name.endsWith('/')) {
        return;
      }

      const promise = fs
        .mkdir(join(outputDir, dirname(fileStream.name)), {
          recursive: true,
        })
        .then(
          () =>
            new Promise<void>((resolve, reject) => {
              const writable = createWriteStream(join(outputDir, fileStream.name));
              writable.on('error', err => {
                fileStream.terminate();
                reject(err);
              });

              let bytes = 0;
              fileStream.ondata = (err, data, isFinal) => {
                if (err) {
                  writable.destroy(err);
                } else {
                  bytes += data.byteLength;
                  writable.write(data, err => {
                    if (err) {
                      writable.destroy(err);
                    } else {
                      if (isFinal) {
                        extractResult.files.push({
                          name: fileStream.name,
                          bytes,
                        });
                        extractResult.totalBytes += bytes;
                        writable.end(resolve);
                      }
                    }
                  });
                }
              };
              fileStream.start();
            }),
        );
      promises.push(promise);
    };

    readableStream.on('error', reason => {
      reject(reason);
    });
    readableStream.on('end', () => {
      unzip.push(new Uint8Array(), true);
      Promise.all(promises)
        .then(() => {
          extractResult.files.sort((a, b) => a.name.localeCompare(b.name));
          resolve();
        })
        .catch(reject);
    });
    readableStream.on('data', (data: Uint8Array) => {
      unzip.push(data);
    });
  });

  return extractResult;
}
