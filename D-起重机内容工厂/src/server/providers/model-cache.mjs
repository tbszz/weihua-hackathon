import { mkdir, rename, unlink, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { ProviderError } from './tripo.mjs';

export function createModelCache(directory, fetcher = fetch) {
  const pending = new Map();
  async function download(task) {
    const destination = path.join(directory, `${task.id}.glb`);
    try { await stat(destination); return destination; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const url = new URL(task.modelUrl);
    if (url.protocol !== 'https:') throw new ProviderError('模型链接格式无效。');
    await mkdir(directory, { recursive: true });
    const temporary = destination + '.part';
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(180000) });
      if (!response.ok || !response.body) throw new Error('download failed');
      let total = 0;
      let header = Buffer.alloc(0);
      const guard = new Transform({
        transform(chunk, _encoding, callback) {
          total += chunk.length;
          if (total > 150 * 1024 * 1024) return callback(new Error('size limit'));
          if (header.length < 4) header = Buffer.concat([header, chunk.subarray(0, 4 - header.length)]);
          if (header.length === 4 && header.toString('ascii') !== 'glTF') return callback(new Error('invalid GLB'));
          callback(null, chunk);
        },
        flush(callback) { callback(total < 12 ? new Error('invalid GLB') : undefined); },
      });
      await pipeline(Readable.fromWeb(response.body), guard, createWriteStream(temporary));
      await rename(temporary, destination);
      return destination;
    } catch {
      await unlink(temporary).catch(() => {});
      throw new ProviderError('模型下载失败，链接可能已过期。请重试查询后再下载。', 502);
    }
  }
  return task => {
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(task.id)) throw new ProviderError('模型编号无效。', 400);
    if (!pending.has(task.id)) pending.set(task.id, download(task).finally(() => pending.delete(task.id)));
    return pending.get(task.id);
  };
}
