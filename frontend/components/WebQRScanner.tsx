/**
 * Native stub. The real implementation is `WebQRScanner.web.tsx` — Metro
 * resolves that for web, this for iOS/Android (where `check-in.tsx` uses
 * expo-camera's `CameraView` directly and never renders this).
 */
export function WebQRScanner(_props: {
  onScan: (data: string) => void;
  paused?: boolean;
}) {
  return null;
}
