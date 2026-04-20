'use client';

import { useState, useRef, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

interface QRScannerProps {
  onScanSuccess: (chaveAcesso: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

interface Device {
  deviceId: string;
  label: string;
}

export default function QRScanner({ onScanSuccess, onError, onClose }: QRScannerProps) {
  const [scanning, setScanning] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const onCloseRef = useRef(onClose);
  const onScanSuccessRef = useRef(onScanSuccess);

  useEffect(() => {
    async function getDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = mediaDevices
          .filter((d) => d.kind === 'videoinput')
          .map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 8)}` }));
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          const envDevice = videoDevices.find((d) => d.label.toLowerCase().includes('back')) || videoDevices[0];
          setSelectedDeviceId(envDevice.deviceId);
        }
      } catch {
        // Permission denied or unavailable
      }
    }
    getDevices();
  }, []);

  onCloseRef.current = onClose;
  onScanSuccessRef.current = onScanSuccess;

  const extractChaveAcesso = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      if (!urlObj.hostname.includes('fazenda.df.gov.br')) {
        return null;
      }
      const params = new URLSearchParams(urlObj.search);
      const chave = params.get('p')?.split("|")[0];
      if (chave && /^\d{44}$/.test(chave)) {
        return chave;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleScan = (result: any) => {
    console.log('[QR] handleScan called:', result);
    if (!result || !Array.isArray(result) || result.length === 0) {
      console.log('[QR] No result');
      return;
    }
    
    const decodedText = result[0]?.rawValue;
    
    console.log('[QR] rawValue:', decodedText);
    const chave = extractChaveAcesso(decodedText);
    console.log('[QR] Chave:', chave);
    
    if (chave) {
      setScanning(false);
      setTimeout(() => {
        onScanSuccessRef.current(chave);
        onCloseRef.current?.();
      }, 100);
    } else {
      if (decodedText.includes('fazenda.df.gov.br')) {
        onError?.(`INVALID_QR_CODE // CHAVE_DE_ACESSO_NOT_FOUND`);
      } else {
        onError?.(`INVALID_QR_CODE // NOT_NFE`);
      }
    }
  };

  const handleError = (error: Error) => {
    const message = error?.message ?? 'UNKNOWN_ERROR';
    if (message.includes('Permission') || message.includes('NotAllowed')) {
      onError?.('CAMERA_PERMISSION_DENIED');
    } else if (message.includes('not found') || message.includes('NotFound')) {
      onError?.('CAMERA_NOT_AVAILABLE');
    } else {
      onError?.(message);
    }
  };

  if (!scanning) {
    return (
      <div className="w-44 h-44 mx-auto mb-4 border-2 border-green-500 rounded-lg bg-hull relative flex items-center justify-center">
        <div className="text-center">
          <span className="text-2xl text-green-500 block mb-2">✓</span>
          <span className="font-mono text-[9px] text-green-400 uppercase">SCANNED</span>
        </div>
      </div>
    );
  }

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDeviceId(e.target.value);
  };

  return (
    <>
      {devices.length > 1 && (
        <select
          value={selectedDeviceId}
          onChange={handleDeviceChange}
          className="w-full mb-2 px-2 py-1 text-xs font-mono bg-hull border border-blue rounded text-blue"
        >
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
      )}
      <div className="w-44 h-44 mx-auto mb-4 border-2 border-blue rounded-lg bg-hull relative overflow-hidden">
        <Scanner
          onScan={handleScan}
          onError={handleError}
          scanDelay={1000}
          constraints={{
            deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          }}
          styles={{
            container: { width: '100%', height: '100%' },
            video: { width: '100%', height: '100%', objectFit: 'cover' },
          }}
        />
      </div>
      <div className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-blue text-center mb-4">
        SCANNING<span style={{ animation: 'pulse-dot 1s step-end infinite' }}>...</span>
      </div>
    </>
  );
}