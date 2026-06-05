export type Role = 'idle' | 'sender' | 'receiver';

export type ConnectionState = RTCPeerConnectionState | 'idle';

export type ReceiveMeta = {
  name: string;
  size: number;
  type: string;
};

export type ControlMessage =
  | ({ kind: 'meta' } & ReceiveMeta)
  | { kind: 'ready' }
  | { kind: 'chunks-written'; count: number }
  | { kind: 'cancel' }
  | { kind: 'done' };

export type SaveFilePickerWindow = Window & {
  showSaveFilePicker(options?: { suggestedName?: string }): Promise<FileSystemFileHandle>;
};
