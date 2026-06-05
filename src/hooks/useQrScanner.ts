import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { scannerErrorMessage } from '../rtc-utils';

const SCAN_TIMEOUT_MS = 45000;

type UseQrScannerOptions = {
  scannerRegionId: string;
  onError: (message: string) => void;
  onScan: (value: string) => void;
  onStatusChange: (message: string) => void;
};

export function useQrScanner({
  scannerRegionId,
  onError,
  onScan,
  onStatusChange,
}: UseQrScannerOptions) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanHandledRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);

  const stopScanner = useCallback(async (updateUi = true) => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop();
        scanner.clear();
      } catch {
        // Scanner may already be stopped when permissions or startup fail.
      }
    }

    if (updateUi) setIsScanning(false);
  }, []);

  useEffect(() => {
    if (!isScanning) return undefined;

    let cancelled = false;
    let scanTimeout: number | undefined;
    scanHandledRef.current = false;

    async function startCamera() {
      try {
        onError('');
        onStatusChange('Starting scanner. Allow camera access.');

        const scanner = new Html5Qrcode(scannerRegionId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (cancelled) return;
        if (!cameras.length) throw new Error('No camera found.');

        const preferredCamera =
          cameras.find((camera) => /back|rear|environment/i.test(camera.label)) ?? cameras[0];

        await scanner.start(
          preferredCamera.id,
          {
            fps: 12,
            qrbox: (width, height) => {
              const size = Math.floor(Math.min(width, height, 320) * 0.82);
              return { width: size, height: size };
            },
            aspectRatio: 1,
            disableFlip: false,
          },
          (decodedText) => {
            if (scanHandledRef.current) return;
            scanHandledRef.current = true;
            if (scanTimeout) window.clearTimeout(scanTimeout);
            onScan(decodedText.trim());
            onStatusChange('Scanned remote code.');
            void stopScanner();
          },
          () => undefined,
        );

        scanTimeout = window.setTimeout(() => {
          if (scanHandledRef.current || cancelled) return;
          onError('Scan timed out. Move closer, enlarge QR, or paste code.');
          onStatusChange('Scanner stopped.');
          void stopScanner();
        }, SCAN_TIMEOUT_MS);

        if (!cancelled) onStatusChange('Point the camera at the QR code.');
      } catch (error) {
        if (!cancelled) {
          onError(scannerErrorMessage(error));
          onStatusChange('Scanner stopped.');
          void stopScanner();
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      if (scanTimeout) window.clearTimeout(scanTimeout);
      void stopScanner(false);
    };
  }, [isScanning, onError, onScan, onStatusChange, scannerRegionId, stopScanner]);

  const startScanner = useCallback(() => {
    onError('');
    setIsScanning(true);
  }, [onError]);

  const cancelScanner = useCallback(() => {
    void stopScanner();
    onStatusChange('Scan cancelled.');
  }, [onStatusChange, stopScanner]);

  return { cancelScanner, isScanning, startScanner, stopScanner };
}
