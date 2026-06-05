import {
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Download,
  FileCheck2,
  Info,
  MonitorSmartphone,
  QrCode,
  RefreshCcw,
  Save,
  Send,
  ShieldCheck,
  Wifi,
} from 'lucide-react';

type InstructionsPageProps = {
  onBack: () => void;
};

const senderSteps = [
  {
    title: 'Open the app on both devices',
    copy: 'Keep both devices on the same local network and leave this page open on each one.',
    icon: MonitorSmartphone,
  },
  {
    title: 'Choose Send',
    copy: 'On the device that has the file, select Send. Wait for its local offer code and QR code to appear.',
    icon: Send,
  },
  {
    title: 'Share the offer',
    copy: 'Let the receiver scan the sender QR code, or copy the local code and send it to the receiver another way.',
    icon: QrCode,
  },
  {
    title: 'Accept the receiver answer',
    copy: 'Scan or paste the answer returned by the receiver into Remote code, then select Accept answer.',
    icon: CheckCircle2,
  },
  {
    title: 'Select and send a file',
    copy: 'After the status says Connected, select a file and choose Send file. The sender waits until the receiver chooses a save location.',
    icon: FileCheck2,
  },
];

const receiverSteps = [
  {
    title: 'Choose Receive',
    copy: 'On the device that will save the file, select Receive.',
    icon: Download,
  },
  {
    title: 'Add the sender offer',
    copy: 'Scan the sender QR code or paste the sender local code into Remote code.',
    icon: QrCode,
  },
  {
    title: 'Create and share the answer',
    copy: 'Select Create answer, then let the sender scan the new QR code or copy the local answer back to them.',
    icon: Clipboard,
  },
  {
    title: 'Wait for the connection',
    copy: 'Once the sender accepts the answer, both devices should show a connected status.',
    icon: Wifi,
  },
  {
    title: 'Choose where to save',
    copy: 'When a file arrives, select Choose save location and approve the browser prompt. Transfer begins after this step.',
    icon: Save,
  },
];

export function InstructionsPage({ onBack }: InstructionsPageProps) {
  return (
    <main className="app-shell">
      <header className="guide-hero">
        <div className="guide-hero-inner">
          <button className="guide-back" onClick={onBack}>
            <ArrowLeft size={18} />
            Back to transfer
          </button>
          <div className="eyebrow">
            <Info size={18} />
            Step-by-step guide
          </div>
          <h1>How to transfer a file</h1>
          <p>
            Connect two devices directly with WebRTC. No file is uploaded to a server, but the
            devices must exchange a one-time offer and answer before sending.
          </p>
        </div>
      </header>

      <div className="guide-content">
        <section className="guide-intro">
          <div>
            <span className="guide-kicker">Before you start</span>
            <h2>Two devices, one local network</h2>
            <p>
              Open this web app on both devices. Use a Chromium-based browser such as Chrome or
              Edge on the receiving device so it can save incoming files directly to disk.
            </p>
          </div>
          <div className="guide-note">
            <ShieldCheck size={24} />
            <div>
              <strong>Private by design</strong>
              <p>The file travels through the direct peer-to-peer connection, not an upload server.</p>
            </div>
          </div>
        </section>

        <section className="flow-summary" aria-label="Connection overview">
          <FlowItem number="1" label="Sender creates offer" />
          <span className="flow-line" />
          <FlowItem number="2" label="Receiver creates answer" />
          <span className="flow-line" />
          <FlowItem number="3" label="Sender accepts answer" />
          <span className="flow-line" />
          <FlowItem number="4" label="Transfer file" />
        </section>

        <section className="guide-columns">
          <StepList
            eyebrow="Device with the file"
            title="Sender instructions"
            tone="sender"
            steps={senderSteps}
          />
          <StepList
            eyebrow="Device saving the file"
            title="Receiver instructions"
            tone="receiver"
            steps={receiverSteps}
          />
        </section>

        <section className="guide-section">
          <div className="guide-section-heading">
            <span className="guide-kicker">Useful details</span>
            <h2>QR codes, status, and starting over</h2>
          </div>
          <div className="detail-grid">
            <DetailCard
              icon={QrCode}
              title="Scan or copy"
              copy="QR scanning is quickest when the devices are together. The long text codes contain the same information and work just as well."
            />
            <DetailCard
              icon={Wifi}
              title="Watch the status"
              copy="The status panel tells you when an offer or answer is ready, when peers connect, and when a transfer completes."
            />
            <DetailCard
              icon={RefreshCcw}
              title="Reset both devices"
              copy="If a connection fails or you want to switch roles, select Reset on both devices and repeat the steps from the beginning."
            />
          </div>
        </section>

        <section className="troubleshooting">
          <div>
            <span className="guide-kicker">Troubleshooting</span>
            <h2>If the devices do not connect</h2>
          </div>
          <ul>
            <li>Confirm both devices are on the same Wi-Fi or LAN and are not using an isolated guest network.</li>
            <li>Make sure the complete offer or answer was scanned or pasted into Remote code.</li>
            <li>Allow camera access when scanning a QR code.</li>
            <li>Reset both devices and create a fresh offer and answer.</li>
          </ul>
        </section>

        <div className="guide-finish">
          <button onClick={onBack}>
            <ArrowLeft size={18} />
            Back to transfer
          </button>
        </div>
      </div>
    </main>
  );
}

function FlowItem({ number, label }: { number: string; label: string }) {
  return (
    <div className="flow-item">
      <b>{number}</b>
      <span>{label}</span>
    </div>
  );
}

function StepList({
  eyebrow,
  title,
  tone,
  steps,
}: {
  eyebrow: string;
  title: string;
  tone: 'sender' | 'receiver';
  steps: typeof senderSteps;
}) {
  return (
    <section className={`step-list ${tone}`}>
      <div className="step-list-heading">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <ol>
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title}>
              <div className="step-number">{index + 1}</div>
              <div className="step-icon">
                <Icon size={20} />
              </div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function DetailCard({
  icon: Icon,
  title,
  copy,
}: {
  icon: typeof QrCode;
  title: string;
  copy: string;
}) {
  return (
    <article className="detail-card">
      <Icon size={22} />
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}
