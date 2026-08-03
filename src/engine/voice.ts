/**
 * Enregistrement de la voix.
 *
 * Deux usages : la voix de l'enfant pendant un atelier (conservée, jamais
 * analysée — à cet âge le fait de produire est ce qui compte), et la voix du
 * parent dans son espace.
 *
 * La permission micro est demandée à la *première utilisation d'un atelier qui
 * enregistre*, jamais au démarrage. Sur une PWA installée elle persiste ensuite.
 */

import { putBlob } from './storage';

export type MicState = 'unknown' | 'granted' | 'denied' | 'unsupported';

let micState: MicState = 'unknown';
let stream: MediaStream | null = null;

export function micStatus(): MicState {
  return micState;
}

/**
 * Ouvre le flux micro, en le réutilisant d'une fois sur l'autre : redemander un
 * `getUserMedia` à chaque item ajoute une latence de plusieurs centaines de
 * millisecondes sur du matériel d'entrée de gamme.
 */
async function ensureStream(): Promise<MediaStream | null> {
  if (stream && stream.active) return stream;

  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    micState = 'unsupported';
    return null;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    micState = 'granted';
    return stream;
  } catch {
    micState = 'denied';
    return null;
  }
}

/**
 * Flux micro brut, pour l'analyse en direct (comptage de frappes).
 *
 * Rend `null` si le micro est refusé ou absent : c'est un cas **nominal**, pas
 * une erreur. L'appelant bascule alors sur son repli sans que l'enfant
 * s'aperçoive de quoi que ce soit.
 */
export async function openMicStream(): Promise<MediaStream | null> {
  return ensureStream();
}

export function releaseMic(): void {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

function bestMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  return candidates.find((t) => MediaRecorder.isTypeSupported?.(t));
}

export interface Recording {
  /** Arrête et rend le blob. `null` si rien n'a pu être capté. */
  stop(): Promise<Blob | null>;
  cancel(): void;
}

/**
 * Démarre un enregistrement. Rend `null` si le micro est refusé ou absent —
 * l'appelant ne doit alors **rien changer à l'écran** : l'enfant continue de
 * parler, l'app se contente de ne pas garder le son.
 */
export async function startRecording(): Promise<Recording | null> {
  const s = await ensureStream();
  if (!s) return null;

  let recorder: MediaRecorder;
  try {
    const mimeType = bestMimeType();
    recorder = new MediaRecorder(s, mimeType ? { mimeType } : undefined);
  } catch {
    return null;
  }

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  let settled = false;

  return {
    stop() {
      return new Promise<Blob | null>((resolve) => {
        if (settled || recorder.state === 'inactive') {
          resolve(null);
          return;
        }
        settled = true;
        recorder.onstop = () => {
          resolve(chunks.length > 0 ? new Blob(chunks, { type: recorder.mimeType }) : null);
        };
        recorder.stop();
      });
    },
    cancel() {
      if (settled) return;
      settled = true;
      recorder.onstop = null;
      if (recorder.state !== 'inactive') recorder.stop();
    },
  };
}

/**
 * Enregistre pendant une durée fixe. Utilisé par l'espace parent, où le parent
 * appuie et relâche — et par le repli du Chemin quand aucune fin de geste ne
 * délimite naturellement l'énoncé.
 */
export async function recordFor(ms: number): Promise<Blob | null> {
  const rec = await startRecording();
  if (!rec) return null;
  await new Promise((r) => setTimeout(r, ms));
  return rec.stop();
}

/** Clé de rangement de la voix de l'enfant : une par item et par séance. */
export function childVoiceKey(sessionStartedAt: number, itemId: string): string {
  return `child.${sessionStartedAt}.${itemId}`;
}

export async function saveChildVoice(
  sessionStartedAt: number,
  itemId: string,
  blob: Blob,
): Promise<void> {
  await putBlob(childVoiceKey(sessionStartedAt, itemId), blob);
}
