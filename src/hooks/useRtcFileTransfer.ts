import { useMemo, useRef, useState } from 'react';
import {
  CHUNK_SIZE,
  decodeSignal,
  encodeSignal,
  MAX_IN_FLIGHT_CHUNKS,
  parseControlMessage,
  RTC_CONFIG,
  sendControlMessage,
  waitForIce,
} from '../rtc-utils';
import type { ConnectionState, ReceiveMeta, Role, SaveFilePickerWindow } from '../types';

const INITIAL_STATUS = 'Pick sender or receiver to begin.';
const MAX_BUFFERED_BYTES = 4 * 1024 * 1024;

export function useRtcFileTransfer() {
  /*
   * Refs hold browser resources and per-chunk counters. They must update
   * immediately without rendering and remain visible to long-lived RTC event
   * handlers. State contains values that affect visible UI.
   */
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const incomingMetaRef = useRef<ReceiveMeta | null>(null);
  const incomingWritableRef = useRef<FileSystemWritableFileStream | null>(null);
  const incomingWriteChainRef = useRef<Promise<void>>(Promise.resolve());
  const receivedBytesRef = useRef(0);
  const receivedChunksRef = useRef(0);
  const receiverReadyResolveRef = useRef<(() => void) | null>(null);
  const receiverReadyRejectRef = useRef<((error: Error) => void) | null>(null);
  const writtenChunksRef = useRef(0);
  const writtenChunksTargetRef = useRef(0);
  const writtenChunksResolveRef = useRef<(() => void) | null>(null);
  const writtenChunksRejectRef = useRef<((error: Error) => void) | null>(null);

  const [role, setRole] = useState<Role>('idle');
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [offer, setOffer] = useState('');
  const [answer, setAnswer] = useState('');
  const [remoteSignal, setRemoteSignal] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sendProgress, setSendProgress] = useState(0);
  const [receiveProgress, setReceiveProgress] = useState(0);
  const [receivedName, setReceivedName] = useState('');
  const [savePending, setSavePending] = useState(false);
  const [transferActive, setTransferActive] = useState(false);
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [error, setError] = useState('');

  const connected = connectionState === 'connected';
  const localSignal = role === 'sender' ? offer : answer;
  const statusTone = useMemo(() => {
    if (error) return 'error';
    if (connected) return 'connected';
    if (connectionState === 'connecting') return 'working';
    return 'idle';
  }, [connected, connectionState, error]);

  function rejectTransferWaits(errorToReject: Error) {
    receiverReadyRejectRef.current?.(errorToReject);
    writtenChunksRejectRef.current?.(errorToReject);
    receiverReadyResolveRef.current = null;
    receiverReadyRejectRef.current = null;
    writtenChunksResolveRef.current = null;
    writtenChunksRejectRef.current = null;
  }

  function waitForWrittenChunks(target: number) {
    if (writtenChunksRef.current >= target) return Promise.resolve();

    // sendFile awaits one target at a time. Receiver acknowledgements release
    // this promise and keep sender from outrunning receiver disk writes.
    writtenChunksTargetRef.current = target;
    return new Promise<void>((resolve, reject) => {
      writtenChunksResolveRef.current = resolve;
      writtenChunksRejectRef.current = reject;
    });
  }

  /**
   * Protocol: meta -> ready -> binary chunks + acknowledgements -> done.
   * Receiver writes directly to disk, preserving chunk order with a promise
   * chain. Sender waits for acknowledgements before declaring success.
   */
  function wireDataChannel(channel: RTCDataChannel) {
    channel.binaryType = 'arraybuffer';
    channelRef.current = channel;
    channel.onopen = () => setStatus('Data channel open. Send file now.');
    channel.onclose = () => {
      rejectTransferWaits(new Error('Data channel closed.'));
      setStatus('Data channel closed.');
    };
    channel.onerror = () => setError('Data channel error.');
    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const message = parseControlMessage(event.data);
        if (!message) {
          setError('Received an invalid control message.');
          return;
        }

        if (message.kind === 'meta') {
          incomingMetaRef.current = {
            name: message.name,
            size: message.size,
            type: message.type,
          };
          incomingWriteChainRef.current = Promise.resolve();
          receivedBytesRef.current = 0;
          receivedChunksRef.current = 0;
          setReceivedName(message.name);
          setReceiveProgress(0);
          setSavePending(true);
          setStatus(`Choose where to save ${message.name}.`);
        }
        if (message.kind === 'ready') {
          receiverReadyResolveRef.current?.();
          receiverReadyResolveRef.current = null;
          receiverReadyRejectRef.current = null;
        }
        if (message.kind === 'chunks-written') {
          const count = Number(message.count);
          if (!Number.isSafeInteger(count) || count < writtenChunksRef.current) return;
          writtenChunksRef.current = count;
          if (count >= writtenChunksTargetRef.current) {
            writtenChunksResolveRef.current?.();
            writtenChunksResolveRef.current = null;
            writtenChunksRejectRef.current = null;
          }
        }
        if (message.kind === 'cancel') {
          rejectTransferWaits(new Error('Receiver cancelled the transfer.'));
        }
        if (message.kind === 'done') {
          const meta = incomingMetaRef.current;
          if (!meta) return;
          incomingWriteChainRef.current = incomingWriteChainRef.current
            .then(async () => {
              await incomingWritableRef.current?.close();
              incomingWritableRef.current = null;
              setReceiveProgress(100);
              setStatus(`Transfer complete. Saved ${meta.name}.`);
            })
            .catch(() => setError('Could not finish writing the received file.'));
        }
        return;
      }

      const meta = incomingMetaRef.current;
      const writable = incomingWritableRef.current;
      if (!meta || !writable) return;
      const chunk = event.data as ArrayBuffer;

      incomingWriteChainRef.current = incomingWriteChainRef.current
        .then(async () => {
          await writable.write(chunk);
          receivedBytesRef.current += chunk.byteLength;
          receivedChunksRef.current += 1;
          setReceiveProgress(Math.min(100, Math.round((receivedBytesRef.current / meta.size) * 100)));
          sendControlMessage(channel, {
            kind: 'chunks-written',
            count: receivedChunksRef.current,
          });
        })
        .catch(() => {
          setError('Could not write the received file to disk.');
          sendControlMessage(channel, { kind: 'cancel' });
        });
    };
  }

  function wirePeer(peer: RTCPeerConnection) {
    peer.onconnectionstatechange = () => {
      setConnectionState(peer.connectionState);
      if (peer.connectionState === 'connected') setStatus('Peers connected. Ready.');
      if (peer.connectionState === 'failed') {
        setError('Connection failed. Restart both sides and try again.');
      }
    };
  }

  async function startSender() {
    setError('');
    setRole('sender');
    setStatus('Creating offer.');
    const peer = new RTCPeerConnection(RTC_CONFIG);
    peerRef.current = peer;
    wirePeer(peer);
    wireDataChannel(peer.createDataChannel('file-transfer'));

    const localOffer = await peer.createOffer();
    await peer.setLocalDescription(localOffer);
    await waitForIce(peer);
    setOffer(encodeSignal(peer.localDescription!.toJSON()));
    setStatus('Offer ready. Share it with receiver.');
  }

  async function startReceiver() {
    setError('');
    setRole('receiver');
    setStatus('Receiver ready. Paste sender offer.');
    const peer = new RTCPeerConnection(RTC_CONFIG);
    peerRef.current = peer;
    wirePeer(peer);
    peer.ondatachannel = (event) => wireDataChannel(event.channel);
  }

  async function createAnswer() {
    try {
      setError('');
      const peer = peerRef.current;
      if (!peer) return;
      await peer.setRemoteDescription(decodeSignal(remoteSignal));
      const localAnswer = await peer.createAnswer();
      await peer.setLocalDescription(localAnswer);
      await waitForIce(peer);
      setAnswer(encodeSignal(peer.localDescription!.toJSON()));
      setStatus('Answer ready. Send it back to sender.');
    } catch {
      setError('Invalid offer.');
    }
  }

  async function acceptAnswer() {
    try {
      setError('');
      const peer = peerRef.current;
      if (!peer) return;
      await peer.setRemoteDescription(decodeSignal(remoteSignal));
      setStatus('Answer accepted. Connecting.');
    } catch {
      setError('Invalid answer.');
    }
  }

  async function sendFile() {
    const channel = channelRef.current;
    if (!selectedFile || !channel || channel.readyState !== 'open') return;

    setSendProgress(0);
    setTransferActive(true);
    setStatus(`Waiting for receiver to choose save location for ${selectedFile.name}.`);
    const receiverReady = new Promise<void>((resolve, reject) => {
      receiverReadyResolveRef.current = resolve;
      receiverReadyRejectRef.current = reject;
    });
    sendControlMessage(channel, {
      kind: 'meta',
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
    });

    try {
      await receiverReady;
      setStatus(`Sending ${selectedFile.name}`);

      let offset = 0;
      let sentChunks = 0;
      writtenChunksRef.current = 0;
      while (offset < selectedFile.size) {
        while (channel.bufferedAmount > MAX_BUFFERED_BYTES) {
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
        const chunk = await selectedFile.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
        channel.send(chunk);
        sentChunks += 1;
        offset += chunk.byteLength;
        setSendProgress(Math.min(100, Math.round((offset / selectedFile.size) * 100)));
        if (sentChunks - writtenChunksRef.current >= MAX_IN_FLIGHT_CHUNKS) {
          await waitForWrittenChunks(sentChunks - MAX_IN_FLIGHT_CHUNKS + 1);
        }
      }

      await waitForWrittenChunks(sentChunks);
      sendControlMessage(channel, { kind: 'done' });
      setStatus('File sent.');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Transfer cancelled.');
    } finally {
      setTransferActive(false);
      receiverReadyResolveRef.current = null;
      receiverReadyRejectRef.current = null;
      writtenChunksResolveRef.current = null;
      writtenChunksRejectRef.current = null;
    }
  }

  async function chooseSaveLocation() {
    const meta = incomingMetaRef.current;
    const channel = channelRef.current;
    if (!meta || !channel || channel.readyState !== 'open') return;

    if (!('showSaveFilePicker' in window)) {
      setError('Direct-to-disk saving is not supported by this browser. Use a Chromium-based browser.');
      setSavePending(false);
      sendControlMessage(channel, { kind: 'cancel' });
      return;
    }

    try {
      setError('');
      const fileHandle = await (window as SaveFilePickerWindow).showSaveFilePicker({
        suggestedName: meta.name,
      });
      incomingWritableRef.current = await fileHandle.createWritable();
      setSavePending(false);
      setStatus(`Receiving ${meta.name}`);
      sendControlMessage(channel, { kind: 'ready' });
    } catch {
      setSavePending(false);
      setStatus('Save cancelled.');
      sendControlMessage(channel, { kind: 'cancel' });
    }
  }

  function reset() {
    void incomingWritableRef.current?.abort();
    rejectTransferWaits(new Error('Transfer reset.'));
    channelRef.current?.close();
    peerRef.current?.close();
    peerRef.current = null;
    channelRef.current = null;
    incomingMetaRef.current = null;
    incomingWritableRef.current = null;
    incomingWriteChainRef.current = Promise.resolve();
    receivedBytesRef.current = 0;
    receivedChunksRef.current = 0;
    writtenChunksRef.current = 0;
    writtenChunksTargetRef.current = 0;
    setRole('idle');
    setConnectionState('idle');
    setOffer('');
    setAnswer('');
    setRemoteSignal('');
    setSelectedFile(null);
    setSendProgress(0);
    setReceiveProgress(0);
    setReceivedName('');
    setSavePending(false);
    setTransferActive(false);
    setStatus(INITIAL_STATUS);
    setError('');
  }

  function copyLocalSignal() {
    void navigator.clipboard.writeText(localSignal);
    setStatus('Copied signal code.');
  }

  function selectFile(file: File | null) {
    setSelectedFile(file);
    setSendProgress(0);
  }

  return {
    acceptAnswer,
    chooseSaveLocation,
    connected,
    connectionState,
    copyLocalSignal,
    createAnswer,
    error,
    localSignal,
    receiveProgress,
    receivedName,
    remoteSignal,
    reset,
    role,
    savePending,
    selectedFile,
    selectFile,
    sendFile,
    sendProgress,
    setError,
    setRemoteSignal,
    setStatus,
    startReceiver,
    startSender,
    status,
    statusTone,
    transferActive,
  };
}
