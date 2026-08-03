/**
 * Résilience du stockage.
 *
 * Ces tests couvrent un défaut qui a rendu l'application **totalement
 * injouable** une fois installée sur la tablette : l'ouverture d'IndexedDB
 * restait bloquée parce qu'un onglet de Chrome retenait une version antérieure
 * de la base, et l'écran restait uni indéfiniment, sans erreur ni explication.
 *
 * La règle qui en découle : aucune opération de stockage ne doit pouvoir
 * empêcher l'enfant de jouer. Au pire, la séance ne s'enregistre pas.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Remplace `openDB` par un double contrôlable, avant tout import du module. */
const openDB = vi.hoisted(() => vi.fn());
vi.mock('idb', () => ({ openDB }));

async function freshStorage() {
  vi.resetModules();
  return import('./storage');
}

beforeEach(() => {
  openDB.mockReset();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ouverture bloquée', () => {
  it("n'attend pas indéfiniment et laisse l'application démarrer", async () => {
    vi.useFakeTimers();
    // Une ouverture qui n'aboutit jamais : exactement le cas d'un onglet
    // ouvert qui retient la version précédente de la base.
    openDB.mockReturnValue(new Promise(() => {}));

    const storage = await freshStorage();
    const pending = storage.loadMastery('counting.sequence');

    await vi.advanceTimersByTimeAsync(5000);

    const mastery = await pending;
    expect(mastery).toEqual({
      skill: 'counting.sequence',
      level: 0,
      streak: 0,
      failures: 0,
    });
    expect(storage.storageUnavailable()).toBe(true);
  });

  it('rend des valeurs jouables plutôt que de lever', async () => {
    vi.useFakeTimers();
    openDB.mockReturnValue(new Promise(() => {}));
    const storage = await freshStorage();

    const pending = Promise.all([
      storage.loadAllMastery(),
      storage.loadSchedules('phono.syllable'),
      storage.recentSessions(3),
      storage.allObjects(),
      storage.allTreasures(),
      storage.blobKeys('voice.'),
      storage.getBlob('absent'),
      storage.lastSession(),
      storage.getSetting('quelconque', 'repli'),
    ]);
    await vi.advanceTimersByTimeAsync(5000);

    // Des listes vides et des replis, jamais une exception : chaque appelant
    // peut continuer sans savoir que le stockage est indisponible.
    await expect(pending).resolves.toEqual([[], [], [], [], [], [], null, null, 'repli']);
  });

  it("n'empêche pas les écritures d'aboutir sans erreur", async () => {
    vi.useFakeTimers();
    openDB.mockReturnValue(new Promise(() => {}));
    const storage = await freshStorage();

    const writes = Promise.all([
      storage.saveMastery({ skill: 'phono.rhyme', level: 2, streak: 0, failures: 0 }),
      storage.setSetting('clef', 1),
      storage.putBlob('k', new Blob(['x'])),
      storage.addTreasure({ id: 't', kind: 'trace', image: null, audio: null, createdAt: 0 }),
      storage.clearAll(),
    ]);
    await vi.advanceTimersByTimeAsync(5000);

    // Aucune ne doit rejeter : une séance qui ne s'enregistre pas reste une
    // séance jouable.
    await expect(writes).resolves.toBeDefined();
  });
});

describe('ouverture en échec', () => {
  it('traite un rejet comme une base indisponible', async () => {
    openDB.mockRejectedValue(new Error('quota'));
    const storage = await freshStorage();

    await expect(storage.loadAllMastery()).resolves.toEqual([]);
    expect(storage.storageUnavailable()).toBe(true);
  });
});

describe('opération qui échoue en cours de route', () => {
  it('rend le repli au lieu de propager', async () => {
    // Base ouverte, mais transaction avortée — quota dépassé, par exemple.
    openDB.mockResolvedValue({
      get: vi.fn().mockRejectedValue(new Error('QuotaExceededError')),
      getAll: vi.fn().mockRejectedValue(new Error('QuotaExceededError')),
      put: vi.fn().mockRejectedValue(new Error('QuotaExceededError')),
    });

    const storage = await freshStorage();

    await expect(storage.loadAllMastery()).resolves.toEqual([]);
    await expect(
      storage.saveMastery({ skill: 'phono.rhyme', level: 1, streak: 0, failures: 0 }),
    ).resolves.toBeUndefined();
    await expect(storage.getSetting('absente', 42)).resolves.toBe(42);
  });
});

describe('déclaration des gestionnaires de blocage', () => {
  it('ferme la connexion quand une autre fenêtre veut migrer', async () => {
    openDB.mockResolvedValue({});
    const storage = await freshStorage();
    await storage.loadAllMastery();

    const options = openDB.mock.calls[0][2];
    expect(typeof options.blocking).toBe('function');
    expect(typeof options.blocked).toBe('function');
    expect(typeof options.terminated).toBe('function');

    // `blocking` doit refermer notre connexion, sinon l'application installée
    // reste coincée tant que l'onglet du navigateur est ouvert.
    const close = vi.fn();
    options.blocking(1, 2, { target: { close } });
    expect(close).toHaveBeenCalled();
  });
});
