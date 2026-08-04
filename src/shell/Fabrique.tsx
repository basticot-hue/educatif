/**
 * La Fabrique.
 *
 * L'enfant photographie ses objets, les détoure grossièrement au doigt, et les
 * nomme à voix haute. C'est le cœur du dispositif : **un enfant qui a fabriqué
 * son matériel y revient seul**, et ces objets alimentent ensuite Le Sac de
 * Chase et Le Château des mots.
 *
 * Aucun niveau, aucune évaluation, aucune bonne réponse. On ne compte rien ici.
 *
 * Le détourage est volontairement grossier — une gomme au doigt suffit. Un
 * détourage automatique serait plus propre et raterait complètement l'intérêt :
 * ce qui compte est que l'enfant ait fait l'objet lui-même.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeImage } from '../content/overrides';
import { pixelRatio } from '../engine/platform';
import { addTreasure, putBlob, saveObject } from '../engine/storage';
import { startRecording, type Recording } from '../engine/voice';
import './fabrique.css';

type Step = 'photo' | 'detourage' | 'nommage' | 'fini';

interface Props {
  onDone: () => void;
}

export function Fabrique({ onDone }: Props) {
  const [step, setStep] = useState<Step>('photo');
  const [recording, setRecording] = useState(false);
  const [made, setMade] = useState(0);

  const fileInput = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const source = useRef<ImageBitmap | null>(null);
  const recorder = useRef<Recording | null>(null);
  const voiceBlob = useRef<Blob | null>(null);
  const drawing = useRef(false);

  useEffect(
    () => () => {
      source.current?.close();
      recorder.current?.cancel();
    },
    [],
  );

  /* ---------------- 1. la photo ---------------- */

  const onFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    // Réduite tout de suite : une photo de tablette fait plusieurs mégaoctets,
    // et la gomme doit rester fluide sous le doigt.
    const normalized = await normalizeImage(file);
    source.current?.close();
    source.current = await createImageBitmap(normalized);
    setStep('detourage');
  }, []);

  /* ---------------- 2. la gomme ---------------- */

  const paintSource = useCallback(() => {
    const node = canvas.current;
    const bitmap = source.current;
    if (!node || !bitmap) return;

    const dpr = pixelRatio();
    const rect = node.getBoundingClientRect();
    node.width = Math.round(rect.width * dpr);
    node.height = Math.round(rect.height * dpr);

    const ctx = node.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // On inscrit l'image entière sans la déformer.
    const scale = Math.min(rect.width / bitmap.width, rect.height / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    ctx.drawImage(bitmap, (rect.width - w) / 2, (rect.height - h) / 2, w, h);
  }, []);

  useEffect(() => {
    if (step !== 'detourage') return;
    paintSource();
    window.addEventListener('resize', paintSource);
    return () => window.removeEventListener('resize', paintSource);
  }, [step, paintSource]);

  const erase = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const node = canvas.current;
    const ctx = node?.getContext('2d');
    if (!node || !ctx) return;

    const rect = node.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Gomme ronde et large : un doigt de 3 ans ne vise pas, il balaie.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, []);

  /* ---------------- 3. le nom, à voix haute ---------------- */

  const startSpeaking = useCallback(async () => {
    setRecording(true);
    recorder.current = await startRecording();
    // Micro refusé : on n'affiche rien de particulier, l'enfant dit son mot
    // quand même et l'objet se fabrique pareil.
  }, []);

  const stopSpeaking = useCallback(async () => {
    setRecording(false);
    const blob = await recorder.current?.stop().catch(() => null);
    recorder.current = null;
    if (blob) voiceBlob.current = blob;
  }, []);

  /* ---------------- 4. enregistrement ---------------- */

  const finish = useCallback(async () => {
    const node = canvas.current;
    if (!node) return;

    const image = await new Promise<Blob | null>((resolve) =>
      node.toBlob(resolve, 'image/png'),
    );
    if (!image) return;

    const id = `obj_${Date.now().toString(36)}`;
    const imageKey = `img.objet.${id}`;
    await putBlob(imageKey, image);

    let audioKey: string | null = null;
    if (voiceBlob.current) {
      audioKey = `voice.objet.${id}`;
      await putBlob(audioKey, voiceBlob.current);
    }

    await saveObject({
      id,
      label: '',
      image: imageKey,
      audioLabel: audioKey,
      syllables: 0,
      onset: '',
      coda: '',
      rime: '',
      category: '',
      createdAt: new Date().toISOString(),
      createdBy: 'child',
      // Le parent renseignera la phonologie : sans elle, l'objet n'a pas de sac.
      complete: false,
    });

    await addTreasure({
      id: `tr_${id}`,
      kind: 'objet',
      image: imageKey,
      audio: audioKey,
      createdAt: Date.now(),
    });

    voiceBlob.current = null;
    source.current?.close();
    source.current = null;
    setMade((n) => n + 1);
    setStep('fini');
  }, []);

  /* ---------------- rendu ---------------- */

  return (
    <div className="screen fabrique">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        // Ouvre directement l'appareil photo arrière de la tablette.
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          void onFile(file);
        }}
      />

      {step === 'photo' && (
        <button className="big-round" aria-label="prendre une photo" onClick={() => fileInput.current?.click()}>
          <CameraGlyph />
        </button>
      )}

      {/*
        Le canvas est rendu **une seule fois** pour le détourage et le nommage.
        Le placer dans deux blocs conditionnels le faisait remonter au
        changement d'étape : React en créait un neuf et vide, et tout le
        détourage de l'enfant était perdu au moment de l'enregistrer.
      */}
      {(step === 'detourage' || step === 'nommage') && (
        <canvas
          ref={canvas}
          className={`fab-canvas ${step === 'nommage' ? 'preview' : ''}`}
          onPointerDown={(e) => {
            if (step !== 'detourage') return;
            drawing.current = true;
            try {
              // `setPointerCapture` jette si le pointeur n'est plus actif, et
              // `?.` ne protège que d'une méthode absente. L'exception
              // sautait le premier coup de gomme.
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Sans capture, le détourage s'arrête au bord du canvas.
            }
            erase(e);
          }}
          onPointerMove={erase}
          onPointerUp={() => {
            drawing.current = false;
          }}
          onPointerCancel={() => {
            drawing.current = false;
          }}
        />
      )}

      {step === 'detourage' && (
        <div className="fab-actions">
          <button className="big-round small" aria-label="recommencer" onClick={paintSource}>
            <UndoGlyph />
          </button>
          <button className="big-round" aria-label="continuer" onClick={() => setStep('nommage')}>
            <NextGlyph />
          </button>
        </div>
      )}

      {step === 'nommage' && (
        <div className="fab-actions">
          <button
            className={`big-round ${recording ? 'listening' : ''}`}
            aria-label="dis son nom"
            onPointerDown={() => void startSpeaking()}
            onPointerUp={() => void stopSpeaking()}
            onPointerLeave={() => recording && void stopSpeaking()}
          >
            <MicGlyph />
          </button>
          <button className="big-round small" aria-label="terminer" onClick={() => void finish()}>
            <NextGlyph />
          </button>
        </div>
      )}

      {step === 'fini' && (
        <div className="fab-actions">
          <button className="big-round" aria-label="un autre objet" onClick={() => setStep('photo')}>
            <CameraGlyph />
          </button>
          <button className="big-round small" aria-label="terminer" onClick={onDone}>
            <HomeGlyph />
          </button>
        </div>
      )}

      {made > 0 && step === 'photo' && <div className="fab-count" aria-hidden="true" />}
    </div>
  );
}

/* ---------------- glyphes : zéro texte ---------------- */

function CameraGlyph() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="6" y="18" width="52" height="36" rx="7" fill="currentColor" />
      <rect x="22" y="10" width="20" height="10" rx="3" fill="currentColor" />
      <circle cx="32" cy="36" r="12" fill="#0F2E4C" />
      <circle cx="32" cy="36" r="7" fill="currentColor" />
    </svg>
  );
}

function MicGlyph() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="24" y="8" width="16" height="28" rx="8" fill="currentColor" />
      <path d="M16 32a16 16 0 0 0 32 0" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <line x1="32" y1="48" x2="32" y2="56" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function NextGlyph() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M24 16 L44 32 L24 48 Z" fill="currentColor" />
    </svg>
  );
}

function UndoGlyph() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M20 26h20a12 12 0 1 1 0 24H26"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M26 16 L14 26 L26 36 Z" fill="currentColor" />
    </svg>
  );
}

function HomeGlyph() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 32 L32 12 L54 32 Z" fill="currentColor" />
      <rect x="18" y="30" width="28" height="22" rx="3" fill="currentColor" />
    </svg>
  );
}
