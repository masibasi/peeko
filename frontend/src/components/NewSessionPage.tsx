import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, CheckCircle, AlertCircle, ArrowRight, X, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { uploadMaterial, getMaterials, startSession, type MaterialStatus } from '../lib/api';

type UploadState = 'idle' | 'uploading' | 'processing' | 'ready' | 'failed';

interface Props {
  onNavigate: (page: string, path?: string) => void;
}

const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
const ACCEPTED_EXT = '.pdf,.docx,.txt';
const MAX_BYTES = 20 * 1024 * 1024;

export function NewSessionPage({ onNavigate }: Props) {
  const { token } = useAuth();

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [material, setMaterial] = useState<MaterialStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // Poll GET /session/:id/materials every 2s until ready or failed
  const startPolling = useCallback((sid: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const materials = await getMaterials(sid, token);
        const mat = materials[materials.length - 1];
        if (!mat) return;
        setMaterial(mat);
        if (mat.status === 'ready') {
          setUploadState('ready');
          stopPolling();
        } else if (mat.status === 'failed') {
          setUploadState('failed');
          setErrorMsg('Processing failed. Please try a different file.');
          stopPolling();
        }
      } catch {
        // transient poll error — keep retrying
      }
    }, 2000);
  }, [token, stopPolling]);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId;
    const { session_id } = await startSession(token);
    setSessionId(session_id);
    return session_id;
  }, [sessionId, token]);

  const handleFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|docx|txt)$/i)) {
      setErrorMsg('Only PDF, DOCX, or TXT files are supported.');
      setUploadState('failed');
      return;
    }
    if (file.size > MAX_BYTES) {
      setErrorMsg('File exceeds 20 MB limit.');
      setUploadState('failed');
      return;
    }

    setSelectedFile(file);
    setErrorMsg('');
    setUploadProgress(0);
    setUploadState('uploading');

    try {
      const sid = await ensureSession();
      await uploadMaterial(sid, file, token, (pct) => setUploadProgress(pct));
      setUploadState('processing');
      startPolling(sid);
    } catch (err) {
      setUploadState('failed');
      setErrorMsg((err as Error).message ?? 'Upload failed. Please try again.');
    }
  }, [ensureSession, token, startPolling]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  const handleStartSession = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      const sid = sessionId ?? (await startSession(token)).session_id;
      onNavigate('session', `/session/${sid}`);
    } catch (err) {
      setErrorMsg((err as Error).message ?? 'Could not start session.');
      setStarting(false);
    }
  }, [starting, sessionId, token, onNavigate]);

  const handleRetry = useCallback(() => {
    setUploadState('idle');
    setSelectedFile(null);
    setMaterial(null);
    setErrorMsg('');
    setUploadProgress(0);
    stopPolling();
  }, [stopPolling]);

  const canStart = uploadState === 'ready';

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 max-w-2xl mx-auto w-full flex items-center gap-2.5">
        <span className="text-2xl leading-none">🦊</span>
        <span className="text-xl font-black text-ink-900 tracking-tight">peeko</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg"
        >
          {/* Card */}
          <div
            className="rounded-3xl p-8"
            style={{
              background: 'var(--bg-surface)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {/* Title */}
            <div className="mb-6">
              <h1 className="text-2xl font-black text-ink-900 mb-1">New session</h1>
              <p className="text-sm text-ink-500">
                Upload lecture slides or notes for smarter summaries — or skip and start right away.
              </p>
            </div>

            {/* Drop zone */}
            <AnimatePresence mode="wait">
              {uploadState === 'idle' || uploadState === 'failed' ? (
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative mb-5"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    aria-label="Upload lecture materials"
                    className="rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all select-none outline-none"
                    style={{
                      borderColor: dragOver ? 'var(--brand)' : 'var(--ink-200)',
                      background: dragOver ? 'var(--brand-subtle)' : 'var(--bg-subtle)',
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: 'var(--brand-subtle)' }}
                    >
                      <Upload className="w-6 h-6" style={{ color: 'var(--brand)' }} />
                    </div>
                    <p className="font-bold text-ink-700 mb-1">
                      {dragOver ? 'Drop it here!' : 'Drag & drop your slides'}
                    </p>
                    <p className="text-xs text-ink-400">PDF, DOCX, or TXT · max 20 MB</p>
                    <p className="text-xs mt-2 font-semibold" style={{ color: 'var(--brand)' }}>
                      or click to browse
                    </p>

                    {uploadState === 'failed' && errorMsg && (
                      <div className="mt-4 flex items-center gap-2 justify-center text-sm" style={{ color: 'oklch(50% 0.18 25)' }}>
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_EXT}
                    className="sr-only"
                    onChange={onFileChange}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="status"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl p-5 mb-5"
                  style={{ background: 'var(--bg-subtle)' }}
                >
                  {/* File name row */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--brand-subtle)' }}
                    >
                      <FileText className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink-800 text-sm truncate">{selectedFile?.name}</p>
                      <p className="text-xs text-ink-400">
                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : ''}
                      </p>
                    </div>
                    {uploadState !== 'uploading' && (
                      <button
                        onClick={handleRetry}
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-ink-100 transition-colors"
                        aria-label="Remove file"
                      >
                        <X className="w-3.5 h-3.5 text-ink-400" />
                      </button>
                    )}
                  </div>

                  {/* Upload progress bar */}
                  {uploadState === 'uploading' && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-ink-500 mb-1.5">
                        <span>Uploading…</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ink-100)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: 'var(--brand)' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ ease: 'linear' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Processing spinner */}
                  {uploadState === 'processing' && (
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
                        style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}
                      />
                      <span className="text-sm font-semibold" style={{ color: 'var(--brand-text)' }}>
                        Processing slides…
                      </span>
                    </div>
                  )}

                  {/* Ready chip */}
                  {uploadState === 'ready' && material && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'oklch(55% 0.14 155)' }} />
                      <span className="text-sm font-bold" style={{ color: 'oklch(38% 0.12 155)' }}>
                        Ready ✓ ({material.chunk_count} chunks)
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={!canStart || starting}
                onClick={handleStartSession}
                className="w-full py-3.5 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2"
                style={{
                  background: canStart ? 'var(--brand)' : 'var(--ink-100)',
                  color: canStart ? '#fff' : 'var(--ink-400)',
                  cursor: canStart ? 'pointer' : 'not-allowed',
                  boxShadow: canStart ? 'var(--shadow-brand)' : 'none',
                }}
              >
                Start session
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              <button
                disabled={starting}
                onClick={handleStartSession}
                className="w-full py-3 rounded-2xl font-bold text-sm transition-colors"
                style={{ color: 'var(--ink-500)', background: 'transparent' }}
              >
                Skip &amp; Start →
              </button>
            </div>
          </div>

          {/* Reassuring footnote */}
          <p className="text-center text-xs text-ink-400 mt-4">
            Materials stay private to this session. Nothing is shared.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
