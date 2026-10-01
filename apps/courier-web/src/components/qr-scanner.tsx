'use client';

import { useEffect, useRef, useState } from 'react';

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};
type BarcodeWindow = Window & {
  BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetectorLike;
};

export function QrScanner({ onRead }: { onRead: (value: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | undefined>(undefined);
  const frame = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  function stop() {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = undefined;
    setOpen(false);
  }

  useEffect(() => {
    if (!open || !video.current || !stream.current) return;
    const videoElement = video.current;
    const cameraStream = stream.current;
    const Detector = (window as BarcodeWindow).BarcodeDetector;
    if (!Detector) return;

    videoElement.srcObject = cameraStream;
    const detector = new Detector({ formats: ['qr_code'] });
    let cancelled = false;
    const scan = async () => {
      if (cancelled) return;
      try {
        const result = await detector.detect(videoElement);
        if (result[0]?.rawValue) {
          onRead(result[0].rawValue);
          stop();
          return;
        }
      } catch {
        // The scanner continues when a frame is temporarily unavailable.
      }
      if (!cancelled) frame.current = requestAnimationFrame(() => void scan());
    };
    void videoElement.play().then(() => {
      setMessage('QR kodu çerçevenin içine al.');
      frame.current = requestAnimationFrame(() => void scan());
    }).catch(() => setMessage('Kamera görüntüsü başlatılamadı.'));

    return () => {
      cancelled = true;
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, [open, onRead]);

  useEffect(
    () => () => stream.current?.getTracks().forEach((track) => track.stop()),
    [],
  );

  async function start() {
    if (!(window as BarcodeWindow).BarcodeDetector) {
      setMessage('Bu tarayıcı QR okumayı desteklemiyor. Kodu alttaki alana elle girebilirsin.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage('Kamera bu ortamda kullanılamıyor. Kodu elle girebilirsin.');
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      setOpen(true);
      setMessage('Kamera hazırlanıyor…');
    } catch {
      setMessage('Kamera izni verilmedi. QR kodunu metin olarak girebilirsin.');
    }
  }

  return (
    <div className="scanner">
      <button type="button" className="outline-button scanner-button" onClick={() => open ? stop() : void start()}>
        {open ? 'Kamerayı kapat' : '▦ Kamerayla okut'} <span>{open ? '×' : '↗'}</span>
      </button>
      {open && <video ref={video} className="scanner-video" muted playsInline />}
      {message && <p className="scanner-message" role="status">{message}</p>}
    </div>
  );
}
