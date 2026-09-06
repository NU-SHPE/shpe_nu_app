import React from 'react';
import { StyleSheet, Text, View, Button, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera'; //For the QR code to be scanned using cameraview
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import * as Haptics from 'expo-haptics'; //For vibration on phone for the scan
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { WebQRScanner } from '../../components/WebQRScanner';
import { colors } from '../../components/theme';
import { isCheckInOpen, isCheckOutOpen } from '@/utils/scanWindow';
import { parseQRPayload } from '@/utils/qrPayload';

/** How long the same QR code is ignored after being handled. */
const SCAN_COOLDOWN_MS = 5000;

type ResultKind = 'success' | 'info' | 'error';
type ScanResult = { kind: ResultKind; title: string; message?: string };

export default function CheckInScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  // On web, Alert.alert is a no-op — every outcome shows here instead. Null on
  // native, where the alert path is unchanged.
  const [result, setResult] = useState<ScanResult | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Remembers the last code handled, so the same one isn't processed again the
  // moment the scanner unlocks. Expires on its own — nothing has to release it.
  const lastScanRef = useRef<{ data: string; at: number } | null>(null);
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    };
  }, []);

  const resetScan = () => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    setScanned(false);
  };

  /**
   * Native keeps the `Alert.alert` popup exactly as before. Web can't show it
   * (it's a no-op), so the same message goes to an inline banner that clears
   * itself.
   */
  const showResult = (kind: ResultKind, title: string, message?: string) => {
    if (Platform.OS === 'web') {
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
      setResult({ kind, title, message });
      resultTimeoutRef.current = setTimeout(() => setResult(null), 4500);
    } else {
      Alert.alert(title, message ?? '', [{ text: 'OK', onPress: resetScan }]);
    }
  };

  const handleScan = async (raw: string) => {
    // Ref, not state: setScanned is async, and the camera fires many times per
    // second while a code is in frame — enough callbacks slip through before
    // the re-render to queue a dozen alerts. The ref is checked immediately.
    const code = raw?.trim() ?? '';
    const now = Date.now();
    if (
      lastScanRef.current &&
      lastScanRef.current.data === code &&
      now - lastScanRef.current.at < SCAN_COOLDOWN_MS
    ) {
      return;
    }
    lastScanRef.current = { data: code, at: now };
    setScanned(true); // keeps the camera prop in sync on re-render

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // The timer runs on every platform, not just web. Alert.alert ignores
    // button callbacks on web, and on Android an alert can be dismissed
    // without onPress firing — so the OK button can never be the only thing
    // that unlocks the scanner or it wedges shut. The cooldown above is what
    // stops it re-handling the same code once it unlocks.
    resetTimeoutRef.current = setTimeout(resetScan, 2500);

    try {
      if (!user) {
        showResult('error', 'Error', 'You must be signed in to check in.');
        return;
      }

      const parsed = parseQRPayload(code);
      if (!parsed) {
        showResult('error', 'Invalid QR code', 'That code isn’t a SHPE event code.');
        return;
      }
      const { eventId, mode } = parsed;

      const eventSnap = await getDoc(doc(db, 'events', eventId));
      if (!eventSnap.exists()) {
        showResult('error', 'Event not found', 'This event may have been removed.');
        return;
      }

      const eventData = eventSnap.data();
      // only allows check-ins during the check-in window.
      const windowOpen =
        mode === 'out' ? isCheckOutOpen(eventData, new Date()) : isCheckInOpen(eventData, new Date());
      if (!windowOpen) {
        showResult(
          'info',
          mode === 'out' ? 'Check-out closed' : 'Check-in closed',
          mode === 'out'
            ? "Check-out isn't open for this event right now."
            : "Check-in isn't open for this event right now.",
        );
        return;
      }

      const eventTitle =
        typeof eventData?.title === 'string' ? eventData.title : 'Event';

      const checkInRef = doc(db, 'checkIns', `${user.uid}_${eventId}`);
      const existing = await getDoc(checkInRef);
      const existingData = existing.data();

      if (mode === 'in') {
        if (existingData?.checkedInAt) {
          showResult('info', 'Already checked in', `You're already checked in to ${eventTitle}.`);
          return;
        }

        await setDoc(
          checkInRef,
          {
            userId: user.uid,
            eventId,
            checkedInAt: serverTimestamp(),
            pointsAwarded: eventData?.checkInPoints ?? 0,
          },
          { merge: true },
        );

        showResult('success', 'Checked in', eventTitle);
      } else {
        if (existingData?.checkedOutAt) {
          showResult('info', 'Already checked out', `You're already checked out of ${eventTitle}.`);
          return;
        }

        await setDoc(
          checkInRef,
          {
            userId: user.uid,
            eventId,
            checkedOutAt: serverTimestamp(),
            checkOutPointsAwarded: eventData?.checkOutPoints ?? 0,
          },
          { merge: true },
        );

        showResult('success', 'Checked out', eventTitle);
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Something went wrong';
      showResult('error', 'Error', message);
    }
  };

  // Auto-request permission when the screen loads (native only — web asks
  // through getUserMedia inside WebQRScanner).
  useEffect(() => {
    if (Platform.OS !== 'web' && !permission) requestPermission();
  }, []);

  return (
    <View style={styles.container}>
      <PageHeader title="Check In" onBack={() => router.back()} />

      <View style={styles.content}>
        {result ? (
          <View
            style={[
              styles.banner,
              result.kind === 'success' && styles.bannerSuccess,
              result.kind === 'error' && styles.bannerError,
              result.kind === 'info' && styles.bannerInfo,
            ]}
          >
            <Text style={styles.bannerTitle}>{result.title}</Text>
            {result.message ? <Text style={styles.bannerMessage}>{result.message}</Text> : null}
          </View>
        ) : null}

        <View style={styles.qrCard}>
          <View style={styles.scannerFrame}>
            {Platform.OS === 'web' ? (
              <WebQRScanner onScan={handleScan} paused={scanned} />
            ) : permission?.granted ? (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : (r: BarcodeScanningResult) => handleScan(r.data)}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              />
            ) : (
              <Button title="Enable Camera" onPress={requestPermission} />
            )}
            <View style={styles.scanLine} />
          </View>

          <Text style={styles.cardTitle}>Scan QR Code to Check In</Text>
          <Text style={styles.cardSubtitle}>
            Position the QR code within the frame to check in to the event
          </Text>
        </View>

        <Text style={styles.footerText}>
          No QR code? <Text style={styles.linkText}>Ask an organizer for assistance</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    width: '100%',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  bannerSuccess: {
    backgroundColor: '#e9f7ef',
    borderColor: '#27ae60',
  },
  bannerError: {
    backgroundColor: '#fdecea',
    borderColor: colors.danger,
  },
  bannerInfo: {
    backgroundColor: colors.purpleTint,
    borderColor: colors.purple,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  bannerMessage: {
    fontSize: 14,
    color: '#444',
    marginTop: 2,
  },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 30,
    width: '100%',
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  scannerFrame: {
    width: 220,
    height: 220,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    overflow: 'hidden',
  },
  scanLine: {
    height: 2,
    width: '110%',
    backgroundColor: colors.purple,
    position: 'absolute',
    zIndex: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.purple,
    textAlign: 'center',
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  footerText: {
    marginTop: 30,
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
  },
  linkText: {
    fontWeight: '600',
    color: '#444',
  },
});
