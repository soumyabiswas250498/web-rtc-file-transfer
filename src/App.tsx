import { CircleHelp, Download, RefreshCcw, Send, Wifi } from 'lucide-react';
import { useState } from 'react';
import { InstructionsPage } from './components/InstructionsPage';
import { SignalPanel } from './components/SignalPanel';
import { TransferPanel } from './components/TransferPanel';
import { useQrScanner } from './hooks/useQrScanner';
import { useRtcFileTransfer } from './hooks/useRtcFileTransfer';

const SCANNER_REGION_ID = 'remote-code-scanner';

export function App() {
  const [showInstructions, setShowInstructions] = useState(false);
  const transfer = useRtcFileTransfer();
  const scanner = useQrScanner({
    scannerRegionId: SCANNER_REGION_ID,
    onError: transfer.setError,
    onScan: transfer.setRemoteSignal,
    onStatusChange: transfer.setStatus,
  });

  function reset() {
    void scanner.stopScanner();
    transfer.reset();
  }

  async function openInstructions() {
    await scanner.stopScanner();
    setShowInstructions(true);
  }

  if (showInstructions) {
    return <InstructionsPage onBack={() => setShowInstructions(false)} />;
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div className="topbar-copy">
          <div className="eyebrow">
            <Wifi size={18} />
            LAN WebRTC transfer
          </div>
          <h1>Peer-to-peer file transfer</h1>
          <p>Manual offer-answer signaling, direct WebRTC data channel, no upload server.</p>
        </div>
        <div className={`status-panel ${transfer.statusTone}`}>
          <div className="status-top">
            <span>Status</span>
            <strong>{transfer.connectionState}</strong>
          </div>
          <p>{transfer.error || transfer.status}</p>
        </div>
      </section>

      <section className="workspace">
        <aside className="steps">
          <button className="help-button" onClick={() => void openInstructions()}>
            <CircleHelp size={18} />
            How to use
          </button>
          <button
            className={transfer.role === 'sender' ? 'active' : ''}
            onClick={() => void transfer.startSender()}
            disabled={transfer.role !== 'idle'}
          >
            <Send size={18} />
            Send
          </button>
          <button
            className={transfer.role === 'receiver' ? 'active' : ''}
            onClick={() => void transfer.startReceiver()}
            disabled={transfer.role !== 'idle'}
          >
            <Download size={18} />
            Receive
          </button>
          <button onClick={reset}>
            <RefreshCcw size={18} />
            Reset
          </button>
        </aside>

        <div className="panels">
          <SignalPanel
            connected={transfer.connected}
            isScanning={scanner.isScanning}
            localSignal={transfer.localSignal}
            remoteSignal={transfer.remoteSignal}
            role={transfer.role}
            scannerRegionId={SCANNER_REGION_ID}
            onAcceptAnswer={() => void transfer.acceptAnswer()}
            onCancelScanner={scanner.cancelScanner}
            onCopySignal={transfer.copyLocalSignal}
            onCreateAnswer={() => void transfer.createAnswer()}
            onRemoteSignalChange={transfer.setRemoteSignal}
            onStartScanner={scanner.startScanner}
          />
          <TransferPanel
            connected={transfer.connected}
            receiveProgress={transfer.receiveProgress}
            receivedName={transfer.receivedName}
            role={transfer.role}
            savePending={transfer.savePending}
            selectedFile={transfer.selectedFile}
            sendProgress={transfer.sendProgress}
            transferActive={transfer.transferActive}
            onChooseSaveLocation={() => void transfer.chooseSaveLocation()}
            onFileChange={transfer.selectFile}
            onSendFile={() => void transfer.sendFile()}
          />
        </div>
      </section>
    </main>
  );
}
