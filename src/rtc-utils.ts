import type { ControlMessage } from './types';

function positiveIntegerEnv(name: string, value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer. Received: ${value ?? 'missing'}`);
  }
  return parsed;
}

export const CHUNK_SIZE = positiveIntegerEnv(
  'VITE_CHUNK_SIZE_KB',
  import.meta.env.VITE_CHUNK_SIZE_KB,
) * 1024;

if (!Number.isSafeInteger(CHUNK_SIZE)) {
  throw new Error('VITE_CHUNK_SIZE_KB is too large to convert safely to bytes.');
}

export const MAX_IN_FLIGHT_CHUNKS = positiveIntegerEnv(
  'VITE_MAX_IN_FLIGHT_CHUNKS',
  import.meta.env.VITE_MAX_IN_FLIGHT_CHUNKS,
);

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [],
};

export function encodeSignal(description: RTCSessionDescriptionInit) {
  return btoa(JSON.stringify(description));
}

export function decodeSignal(value: string): RTCSessionDescriptionInit {
  return JSON.parse(atob(value.trim()));
}

export function sendControlMessage(channel: RTCDataChannel, message: ControlMessage) {
  channel.send(JSON.stringify(message));
}

/**
 * Data channels can receive arbitrary text from the remote browser. Validate
 * control messages at the boundary so the rest of the transfer code can use a
 * precise union type instead of repeatedly checking optional properties.
 */
export function parseControlMessage(value: string): ControlMessage | null {
  let message: unknown;

  try {
    message = JSON.parse(value);
  } catch {
    return null;
  }

  if (!message || typeof message !== 'object' || !('kind' in message)) return null;
  const candidate = message as Record<string, unknown>;

  switch (candidate.kind) {
    case 'meta':
      if (
        typeof candidate.name === 'string' &&
        typeof candidate.size === 'number' &&
        Number.isSafeInteger(candidate.size) &&
        candidate.size >= 0 &&
        typeof candidate.type === 'string'
      ) {
        return {
          kind: 'meta',
          name: candidate.name,
          size: candidate.size,
          type: candidate.type,
        };
      }
      return null;
    case 'chunks-written':
      return typeof candidate.count === 'number'
        ? { kind: 'chunks-written', count: candidate.count }
        : null;
    case 'ready':
    case 'cancel':
    case 'done':
      return { kind: candidate.kind };
    default:
      return null;
  }
}

export function formatBytes(bytes: number) {
  if (!bytes) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function scannerErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/permission|notallowed|denied/i.test(message)) return 'Camera permission denied.';
  if (/notfound|no camera|devicesnotfound/i.test(message)) return 'No camera found.';
  return 'Could not start QR scanner.';
}

/**
 * Manual signaling must include every locally discovered ICE candidate because
 * there is no signaling server available to deliver later "trickle ICE"
 * candidates. The timeout prevents unusual browser/network failures from
 * blocking offer creation forever.
 */
export function waitForIce(peer: RTCPeerConnection) {
  if (peer.iceGatheringState === 'complete') return Promise.resolve();

  return new Promise<void>((resolve) => {
    const finish = () => {
      peer.removeEventListener('icegatheringstatechange', onStateChange);
      window.clearTimeout(timeout);
      resolve();
    };
    const onStateChange = () => {
      if (peer.iceGatheringState === 'complete') finish();
    };
    const timeout = window.setTimeout(finish, 2500);

    peer.addEventListener('icegatheringstatechange', onStateChange);
  });
}
