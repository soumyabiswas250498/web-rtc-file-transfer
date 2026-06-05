import { QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

type SignalQrProps = {
  label: string;
  value: string;
};

export function SignalQr({ label, value }: SignalQrProps) {
  if (!value) return null;

  return (
    <div className="qr-card">
      <QRCodeSVG
        value={value}
        size={280}
        level="L"
        marginSize={2}
        title={`${label} QR code`}
      />
      <span>
        <QrCode size={15} />
        {label} QR
      </span>
    </div>
  );
}
