import { Download, FileArchive, Send, Upload } from 'lucide-react';
import { formatBytes } from '../rtc-utils';
import type { Role } from '../types';

type TransferPanelProps = {
  connected: boolean;
  receiveProgress: number;
  receivedName: string;
  role: Role;
  savePending: boolean;
  selectedFile: File | null;
  sendProgress: number;
  transferActive: boolean;
  onChooseSaveLocation: () => void;
  onFileChange: (file: File | null) => void;
  onSendFile: () => void;
};

export function TransferPanel({
  connected,
  receiveProgress,
  receivedName,
  role,
  savePending,
  selectedFile,
  sendProgress,
  transferActive,
  onChooseSaveLocation,
  onFileChange,
  onSendFile,
}: TransferPanelProps) {
  const senderControlsDisabled = !connected || role !== 'sender' || transferActive;

  return (
    <section className="panel">
      <div className="panel-title">
        <FileArchive size={19} />
        <h2>Transfer</h2>
      </div>

      <label className="file-picker">
        <Upload size={24} />
        <input
          type="file"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          disabled={senderControlsDisabled}
        />
        <span>{selectedFile ? selectedFile.name : 'Select file'}</span>
        {selectedFile && <small>{formatBytes(selectedFile.size)}</small>}
      </label>

      <button onClick={onSendFile} disabled={senderControlsDisabled || !selectedFile}>
        <Send size={17} />
        Send file
      </button>

      <ProgressRow label="Sent" progress={sendProgress} />
      <ProgressRow label="Received" progress={receiveProgress} />

      {receivedName && <p className="muted">Incoming: {receivedName}</p>}
      {savePending && role === 'receiver' && (
        <button className="download" onClick={onChooseSaveLocation}>
          <Download size={17} />
          Choose save location
        </button>
      )}
    </section>
  );
}

function ProgressRow({ label, progress }: { label: string; progress: number }) {
  return (
    <div className="progress-row">
      <span>{label}</span>
      <progress value={progress} max="100" />
      <b>{progress}%</b>
    </div>
  );
}
