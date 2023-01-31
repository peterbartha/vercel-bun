/* eslint-disable no-console */
import fetch from 'node-fetch';
import { basename, join } from 'path';
import { unzip } from './unzip.js';

const BUN_VERSION = 'v0.5.3';
const GITHUB_REPO = 'https://github.com/oven-sh/bun';
const SUPPORTED_PLATFORMS = ['darwin', 'linux'];
const SUPPORTED_CPU_ARCH = ['arm64', 'x64'];

/**
 * Determine Bun download URL using the target machine's CPU architecture and OS platform.
 * @param version The desired version of Bun to download.
 * @returns The download URL of the selected Bun version.
 */
function getBunDownloadUrl(version: 'latest' | string) {
  if (!SUPPORTED_PLATFORMS.includes(process.platform)) {
    if (process.platform === 'win32') {
      throw new Error('Please install bun using Windows Subsystem for Linux');
    }
    throw new Error('Unsupported operation system.');
  }
  if (!SUPPORTED_CPU_ARCH.includes(process.arch)) {
    throw new Error('Unsupported CPU architecture.');
  }

  const archiveName = `bun-${process.platform}-${
    process.arch === 'arm64' ? 'aarch64' : process.arch
  }.zip`;

  if (version === 'latest') {
    return `${GITHUB_REPO}/releases/latest/download/${archiveName}`;
  }
  return `${GITHUB_REPO}/releases/download/bun-${version}/${archiveName}`;
}

/**
 * Download Bun archive from GitHub Releases (https://github.com/oven-sh/bun/releases).
 * @param bunDir Target directory (e.g. `.vercel/cache`).
 * @returns Relative path to the directory of extracted `bun` binary.
 */
export async function downloadBun(bunDir: string): Promise<string> {
  const downloadUrl = getBunDownloadUrl(BUN_VERSION);
  const archiveName = basename(downloadUrl, '.zip');
  console.log(`Downloading Bun ${BUN_VERSION} (${archiveName}.zip)...`);
  const response = await fetch(downloadUrl);

  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to download Bun from ${downloadUrl}: [${response.status}] ${response.statusText}`,
    );
  }

  await unzip(response.body, bunDir);
  console.log('Bun download completed successfully.');

  return join(bunDir, basename(archiveName, '.zip'));
}
