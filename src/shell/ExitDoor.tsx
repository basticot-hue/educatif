/**
 * La porte de sortie de l'enfant.
 *
 * Un atelier ne doit **jamais** être une impasse. Jusqu'ici, une fois la série
 * commencée, le seul moyen d'en sortir était la porte parent — un appui long de
 * deux secondes suivi d'une opération arithmétique. Autrement dit : un enfant
 * qui tombait sur un atelier qui ne lui plaisait pas y restait enfermé pour huit
 * items, et n'avait plus qu'à reposer la tablette.
 *
 * Elle est volontairement différente de la porte parent :
 *
 * - **un simple appui**, pas un appui long. Partir n'est pas une manœuvre à
 *   apprendre : c'est le pendant du geste par lequel on est entré ;
 * - **une maison**, le seul glyphe que l'enfant a déjà vu ailleurs (Studio,
 *   Fabrique) pour « je retourne à l'étagère » ;
 * - **en bas à gauche**, à l'opposé de la porte parent, pour qu'aucune des deux
 *   ne s'ouvre en visant l'autre.
 *
 * Quitter en cours de série n'est pas un échec : la série s'arrête, rien ne se
 * reproche à l'enfant. Le moteur le compte comme un abandon — c'est un des trois
 * signaux d'une séance « off », et c'est exactement ce qu'il faut savoir.
 */

export function ExitDoor({ onExit }: { onExit: () => void }) {
  return (
    <button className="exit-door" aria-label="Retourner à l'étagère" onClick={onExit}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path
          className="glyph"
          d="M8 30 L32 10 L56 30"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="glyph"
          d="M14 28 L14 54 L50 54 L50 28"
          fill="none"
          strokeWidth="6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
