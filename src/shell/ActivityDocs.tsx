/**
 * Documentation des ateliers, pour le parent.
 *
 * L'enfant, lui, n'a **aucun texte** : il reconnaît un atelier à son motif et
 * comprend la tâche par la voix du personnage. C'est délibéré et cela ne
 * changera pas — il ne lit pas.
 *
 * Mais le parent, qui doit accompagner une séance sur deux, a besoin de savoir
 * ce qu'il regarde : le nom de l'atelier, ce qu'il construit, ce qu'on attend
 * de l'enfant, et où il en est. C'est ce que cet écran donne.
 */

import { useEffect, useState } from 'react';
import { ACTIVITY_DOCS } from '../content/prompts';
import { loadAllMastery } from '../engine/storage';
import type { Mastery, SkillId } from '../engine/types';

export function ActivityDocs({ onClose }: { onClose: () => void }) {
  const [mastery, setMastery] = useState<Mastery[]>([]);

  useEffect(() => {
    void loadAllMastery().then(setMastery);
  }, []);

  const levelOf = (skills: SkillId[]): number | null => {
    const rows = mastery.filter((m) => skills.includes(m.skill));
    if (rows.length === 0) return null;
    return Math.max(...rows.map((m) => m.level));
  };

  return (
    <div className="parent">
      <div className="parent-inner">
        <h1>Les ateliers</h1>
        <p className="muted">
          À l'écran, l'enfant ne voit aucun texte et n'entend qu'une consigne parlée. Cette
          page est pour vous : ce que chaque atelier travaille, ce qu'on attend de l'enfant,
          et où il en est aujourd'hui.
        </p>
        <div className="callout">
          Les niveaux ne sont <strong>jamais</strong> montrés à l'enfant, ni annoncés, ni
          sonorisés. Ils montent et descendent tout seuls pour le maintenir autour de 80 % de
          réussite — en dessous il se décourage, au-dessus il n'apprend plus rien. Ne lui en
          parlez pas : un enfant poussé au-dessus de son niveau réel n'apprend pas plus vite.
        </div>

        {ACTIVITY_DOCS.map((doc) => {
          const level = levelOf(doc.skills);
          return (
            <section key={doc.id}>
              <h2>{doc.name}</h2>

              <p>
                <strong>Ce que ça travaille.</strong> {doc.goal}
              </p>
              <p>
                <strong>Ce que l'enfant doit faire.</strong> {doc.childDoes}
              </p>
              <p className="muted">{doc.why}</p>

              <p>
                <strong>Ce qu'il entend :</strong>
              </p>
              <ul>
                {Object.entries(doc.prompts).map(([key, text]) => (
                  <li key={key}>« {text} »</li>
                ))}
              </ul>

              <p>
                <strong>Les niveaux</strong>
                {level !== null && (
                  <span className="muted">
                    {' '}
                    — il en est actuellement au niveau {level}
                    {level >= doc.levels.length ? ' (au-delà du tableau : il n’y a pas de plafond)' : ''}
                  </span>
                )}
              </p>
              <ol start={0}>
                {doc.levels.map((line, i) => (
                  <li
                    key={line}
                    style={
                      i === level
                        ? { fontWeight: 600 }
                        : { opacity: level !== null && i < level ? 0.5 : 1 }
                    }
                  >
                    {line}
                  </li>
                ))}
              </ol>
            </section>
          );
        })}

        <h2>Les ateliers à venir</h2>
        <p className="muted">
          Le Bal des syllabes, Le Sac de Chase, Le Sable, Le Château des mots, Le Récit, la
          Fabrique et le Studio ne sont pas encore construits. Ils apparaîtront sur l'étagère
          au fur et à mesure.
        </p>

        <div className="btn-row">
          <button className="btn ghost" onClick={onClose}>
            Retour
          </button>
        </div>
      </div>
    </div>
  );
}
