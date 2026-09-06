import { useCallback, useEffect, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { doc, deleteDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { RESUME_MAX_BYTES, resumeStoragePath, type ResumeDoc } from '../types/resume';

type Busy = 'idle' | 'picking' | 'uploading' | 'removing' | 'opening';

/**
 * The current member's own resume PDF: live metadata plus pick-and-upload,
 * open, and remove. The file goes to Storage at `resumes/{uid}/resume.pdf`
 * and a metadata doc to `resumes/{uid}` so the admin book can list it.
 * Career fields (grad year etc.) are on the `users` profile, not here.
 */
export function useMyResume() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [resume, setResume] = useState<ResumeDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Busy>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid) {
      setResume(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return onSnapshot(
      doc(db, 'resumes', uid),
      (snap) => {
        setResume(snap.exists() ? (snap.data() as ResumeDoc) : null);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading resume:', err);
        setLoading(false);
      },
    );
  }, [uid]);

  const pickAndUpload = useCallback(async () => {
    if (!uid) return;
    setError('');
    setBusy('picking');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) {
        setBusy('idle');
        return;
      }
      const asset = result.assets[0];

      // The picker's type filter isn't airtight on every platform.
      const isPdf =
        asset.mimeType === 'application/pdf' ||
        asset.name?.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setError('That’s not a PDF. Export your resume as a PDF and try again.');
        setBusy('idle');
        return;
      }
      if (asset.size != null && asset.size > RESUME_MAX_BYTES) {
        setError('That file is over 5 MB. Please upload a smaller PDF.');
        setBusy('idle');
        return;
      }

      setBusy('uploading');
      // Works on web and for the small PDFs resumes are. If native upload of
      // larger files ever misbehaves, switch to expo-file-system base64 +
      // uploadString rather than fetching the file:// URI into a blob.
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      await uploadBytes(ref(storage, resumeStoragePath(uid)), blob, {
        contentType: 'application/pdf',
      });
      await setDoc(doc(db, 'resumes', uid), {
        userId: uid,
        fileName: asset.name ?? 'resume.pdf',
        size: asset.size ?? blob.size,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error uploading resume:', err);
      setError('Upload failed. Check your connection and try again.');
    } finally {
      setBusy('idle');
    }
  }, [uid]);

  const remove = useCallback(async () => {
    if (!uid) return;
    setError('');
    setBusy('removing');
    try {
      await deleteObject(ref(storage, resumeStoragePath(uid))).catch((err) => {
        // A missing object is fine — we still want the doc gone.
        if (err?.code !== 'storage/object-not-found') throw err;
      });
      await deleteDoc(doc(db, 'resumes', uid));
    } catch (err) {
      console.error('Error removing resume:', err);
      setError('Could not remove your resume. Please try again.');
    } finally {
      setBusy('idle');
    }
  }, [uid]);

  const getUrl = useCallback(async () => {
    if (!uid) return null;
    setBusy('opening');
    try {
      return await getDownloadURL(ref(storage, resumeStoragePath(uid)));
    } catch (err) {
      console.error('Error opening resume:', err);
      setError('Could not open your resume.');
      return null;
    } finally {
      setBusy('idle');
    }
  }, [uid]);

  return { resume, loading, busy, error, pickAndUpload, remove, getUrl };
}
