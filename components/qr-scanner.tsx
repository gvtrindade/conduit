'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (chaveAcesso: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

export default function QRScanner({ onScanSuccess, onError, onClose }: QRScannerProps) {
  const [status, setStatus] = useState<'INITIALIZING' | 'SCANNING' | 'ERROR'>('INITIALIZING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const containerId = 'qr-scanner-container';

  const extractChaveAcesso = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname !== 'receita.fazenda.df.gov.br') {
        return null;
      }
      const params = new URLSearchParams(urlObj.search);
      const chave = params.get('chave');
      if (chave && /^\d{44}$/.test(chave)) {
        return chave;
      }
      return null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;
    let mounted = true;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode(containerId);

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (!mounted) return;
            const chave = extractChaveAcesso(decodedText);
            if (chave) {
              scanner?.stop().catch(() => {});
              onScanSuccess(chave);
              onCloseRef.current?.();
            } else {
              if (decodedText.includes('receita.fazenda.df.gov.br')) {
                onError?.('INVALID_QR_CODE // CHAVE_DE_ACESSO_NOT_FOUND');
              }
            }
          },
          () => {}
        );
        if (mounted) {
          scannerRef.current = scanner;
          setStatus('SCANNING');
        }
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
        if (message.includes('Permission') || message.includes('NotAllowed')) {
          setErrorMessage('CAMERA_PERMISSION_DENIED');
        } else if (message.includes('not found') || message.includes('NotFound')) {
          setErrorMessage('CAMERA_NOT_AVAILABLE');
        } else {
          setErrorMessage(message);
        }
        setStatus('ERROR');
        onError?.(message);
      }
    };

    startScanner();

    return () => {
      mounted = false;
      const scannerInstance = scanner;
      if (scannerInstance) {
        scannerInstance.stop().catch(() => {}).then(() => {
          scannerInstance.clear();
        }).catch(() => {
          const el = document.getElementById(containerId);
          if (el) {
            const video = el.querySelector('video');
            if (video?.srcObject) {
              (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            }
            el.innerHTML = '';
          }
        });
      }
    };
  }, []);

  if (status === 'ERROR') {
    return (
      <div className="w-44 h-44 mx-auto mb-4 border-2 border-red-500 rounded-lg bg-hull relative flex items-center justify-center">
        <div className="text-center">
          <span className="text-2xl text-red-500 block mb-2">⊘</span>
          <span className="font-mono text-[9px] text-red-400 uppercase">{errorMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div id={containerId} className="w-44 h-44 mx-auto mb-4 border-2 border-blue rounded-lg bg-hull relative overflow-hidden" />
      <div className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-blue text-center mb-4">
        {status === 'INITIALIZING' ? 'INITIALIZING' : 'SCANNING'}
        <span style={{ animation: 'pulse-dot 1s step-end infinite' }}>...</span>
      </div>
    </>
  );
}