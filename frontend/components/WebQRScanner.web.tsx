import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import jsQR from 'jsqr';
import { colors } from './theme';

type Status = 'starting' | 'live' | 'denied' | 'nocamera' | 'insecure' | 'error';

interface Props {
  onScan: (data: string) => void;
  paused?: boolean;
}

/**
 * QR scanning for the web build. iOS Safari (and every iOS browser — all
 * WebKit) has no `BarcodeDetector`, which is what `expo-camera`'s web path
 * relies on, so `CameraView`'s `onBarcodeScanned` never fires there. This
 * grabs the camera with `getUserMedia` (which iOS Safari *does* support over
 * https) and decodes frames with jsQR in JS instead.
 *
 * The parent's cooldown ref dedupes repeat hits on the same code; `paused`
 * just stops the decode loop while a result banner is showing.
 */
export function WebQRScanner({ onScan, paused }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pausedRef = useRef(!!paused);
  const onScanRef = useRef(onScan);
  const [status, setStatus] = useState<Status>('starting');

  useEffect(() => {
    pausedRef.current = !!paused;
  }, [paused]);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);
    if (pausedRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const code = jsQR(data, w, h, { inversionAttempts: 'dontInvert' });
    if (code?.data) onScanRef.current(code.data);
  }, []);

  const start = useCallback(async () => {
    setStatus('starting');

    if (typeof window === 'undefined' || !window.isSecureContext) {
      setStatus('insecure');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('nocamera');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      setStatus('live');

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      tick();
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') setStatus('denied');
      else if (name === 'NotFoundError' || name === 'OverconstrainedError') setStatus('nocamera');
      else setStatus('error');
    }
  }, [tick]);

  useEffect(() => {
    start();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [start]);

  if (status === 'starting' || status === 'live') {
    return (
      <View style={StyleSheet.absoluteFill}>
        {React.createElement('video', {
          ref: videoRef,
          muted: true,
          playsInline: true,
          autoPlay: true,
          style: { width: '100%', height: '100%', objectFit: 'cover' },
        })}
        {React.createElement('canvas', { ref: canvasRef, style: { display: 'none' } })}
      </View>
    );
  }

  const message: Record<Exclude<Status, 'starting' | 'live'>, string> = {
    denied:
      'Camera access is blocked. Allow it for this site in your browser settings, then tap Try again.',
    nocamera: 'No camera was found on this device.',
    insecure: 'The camera only works over a secure (https) connection.',
    error: 'Could not start the camera. Tap Try again.',
  };

  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackText}>{message[status]}</Text>
      {status !== 'insecure' ? (
        <TouchableOpacity style={styles.retry} onPress={start}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  fallbackText: {
    fontSize: 13,
    color: '#444',
    textAlign: 'center',
    lineHeight: 18,
  },
  retry: {
    backgroundColor: colors.purple,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
