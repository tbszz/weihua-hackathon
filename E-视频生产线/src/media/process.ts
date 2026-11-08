import {spawn} from 'node:child_process';

export type ProcessResult = {
  stdout: string;
  stderr: string;
};

export type ProcessFailureReason =
  | 'spawn'
  | 'exit'
  | 'timeout'
  | 'aborted'
  | 'max-output';

export type RunProcessOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
  maxOutputBytes?: number;
};

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

export class ProcessExecutionError extends Error {
  public readonly command: string;
  public readonly args: readonly string[];
  public readonly exitCode: number | null;
  public readonly stdout: string;
  public readonly stderr: string;
  public readonly reason: ProcessFailureReason;

  public constructor(input: {
    command: string;
    args: readonly string[];
    exitCode: number | null;
    stdout: string;
    stderr: string;
    reason: ProcessFailureReason;
    cause?: unknown;
  }) {
    const detail = input.stderr.trim() || input.stdout.trim() || 'no process output';
    super(
      `${input.command} failed (${input.reason}, exit ${String(input.exitCode)}): ${detail}`,
      input.cause === undefined ? undefined : {cause: input.cause},
    );
    this.name = 'ProcessExecutionError';
    this.command = input.command;
    this.args = [...input.args];
    this.exitCode = input.exitCode;
    this.stdout = input.stdout;
    this.stderr = input.stderr;
    this.reason = input.reason;
  }
}

const positiveInteger = (value: number, name: string): number => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
  return value;
};

export const runProcess = async (
  command: string,
  args: readonly string[],
  options: RunProcessOptions = {},
): Promise<ProcessResult> => {
  const timeoutMs = positiveInteger(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    'timeoutMs',
  );
  const maxOutputBytes = positiveInteger(
    options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES,
    'maxOutputBytes',
  );

  if (options.signal?.aborted === true) {
    throw new ProcessExecutionError({
      command,
      args,
      exitCode: null,
      stdout: '',
      stderr: '',
      reason: 'aborted',
      cause: options.signal.reason,
    });
  }

  const child = spawn(command, [...args], {
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  let capturedBytes = 0;
  let terminationReason: ProcessFailureReason | undefined;
  let spawnError: unknown;

  const terminate = (reason: ProcessFailureReason): void => {
    if (terminationReason !== undefined) {
      return;
    }
    terminationReason = reason;
    child.kill();
  };

  const consume = (target: Buffer[], chunk: Buffer | string): void => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const remainingBytes = Math.max(0, maxOutputBytes - capturedBytes);
    if (remainingBytes > 0) {
      const captured = buffer.subarray(0, remainingBytes);
      target.push(captured);
      capturedBytes += captured.length;
    }
    if (buffer.length > remainingBytes) {
      terminate('max-output');
    }
  };

  child.stdout?.on('data', (chunk: Buffer | string) => consume(stdoutChunks, chunk));
  child.stderr?.on('data', (chunk: Buffer | string) => consume(stderrChunks, chunk));

  const timeout = setTimeout(() => terminate('timeout'), timeoutMs);
  const onAbort = (): void => terminate('aborted');
  options.signal?.addEventListener('abort', onAbort, {once: true});

  const exitCode = await new Promise<number | null>((resolve) => {
    child.once('error', (error) => {
      spawnError = error;
      terminationReason ??= 'spawn';
    });
    child.once('close', resolve);
  });
  clearTimeout(timeout);
  options.signal?.removeEventListener('abort', onAbort);
  const stdout = Buffer.concat(stdoutChunks).toString('utf8');
  const stderr = Buffer.concat(stderrChunks).toString('utf8');

  if (spawnError !== undefined || terminationReason !== undefined || exitCode !== 0) {
    throw new ProcessExecutionError({
      command,
      args,
      exitCode,
      stdout,
      stderr,
      reason:
        terminationReason ?? (spawnError === undefined ? 'exit' : 'spawn'),
      ...(spawnError === undefined ? {} : {cause: spawnError}),
    });
  }

  return {stdout, stderr};
};
