import { CheckCircle2, Clipboard, Link2, PlugZap, ScanLine, X } from 'lucide-react';
import { SignalQr } from './SignalQr';
import type { Role } from '../types';

type SignalPanelProps = {
  connected: boolean;
  isScanning: boolean;
  localSignal: string;
  remoteSignal: string;
  role: Role;
  scannerRegionId: string;
  onAcceptAnswer: () => void;
  onCancelScanner: () => void;
  onCopySignal: () => void;
  onCreateAnswer: () => void;
  onRemoteSignalChange: (value: string) => void;
  onStartScanner: () => void;
};

export function SignalPanel({
  connected,
  isScanning,
  localSignal,
  remoteSignal,
  role,
  scannerRegionId,
  onAcceptAnswer,
  onCancelScanner,
  onCopySignal,
  onCreateAnswer,
  onRemoteSignalChange,
  onStartScanner,
}: SignalPanelProps) {
  if (role === 'idle') {
    return (
      <section className="panel">
        <PanelTitle />
        <p className="muted">Choose send or receive.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <PanelTitle />
      <label>
        Local code
        <textarea readOnly value={localSignal} placeholder="Generated code appears here" />
      </label>
      <SignalQr label="Local code" value={localSignal} />
      <div className="button-row">
        <button className="secondary" onClick={onCopySignal} disabled={!localSignal}>
          <Clipboard size={17} />
          Copy
        </button>
      </div>

      <label>
        Remote code
        <textarea
          value={remoteSignal}
          onChange={(event) => onRemoteSignalChange(event.target.value)}
          placeholder={role === 'sender' ? 'Paste receiver answer' : 'Paste sender offer'}
        />
      </label>
      <SignalQr label="Remote code" value={remoteSignal} />
      <div className="button-row">
        <button className="secondary" onClick={onStartScanner} disabled={isScanning}>
          <ScanLine size={17} />
          Scan code
        </button>
      </div>

      {isScanning && (
        <div className="scanner-panel">
          <div id={scannerRegionId} className="scanner-region" />
          <button className="secondary" onClick={onCancelScanner}>
            <X size={17} />
            Cancel scan
          </button>
        </div>
      )}

      {role === 'receiver' ? (
        <button onClick={onCreateAnswer} disabled={!remoteSignal}>
          <PlugZap size={17} />
          Create answer
        </button>
      ) : (
        <button onClick={onAcceptAnswer} disabled={!remoteSignal || connected}>
          <CheckCircle2 size={17} />
          Accept answer
        </button>
      )}
    </section>
  );
}

function PanelTitle() {
  return (
    <div className="panel-title">
      <Link2 size={19} />
      <h2>Signal</h2>
    </div>
  );
}
