/**
 * Regles metier du lecteur de lecon.
 *
 * Ces deux regles decideent si un eleve peut passer d'une etape a l'autre. Elles
 * sont ici, hors du composant, pour deux raisons :
 *
 * 1. elles sont testables sans monter React, avec des entrees et des sorties
 *    explicites ;
 * 2. un composant qui rend 500 lignes de JSX ne dit pas, quand il casse,
 *    si le defaut est dans le rendu ou dans la regle.
 *
 * Elles ont ete extraites apres deux bugs qui laissaient le build vert : la
 * reprise qui menait l'eleve a sa premiere etape deja reussie, et le
 * verrouillage des etapes facultatives qui laissait sauter du contenu
 * obligatoire — puis le bloquait une fois le travail fini.
 *
 * Les regles sont ecrites en francais et en une phrase chacune. Les tests
 * doivent s'appuyer sur ces phrases, pas sur le code : un test qui reproduit
 * l'implementation actuelle ne protege que le bug qu'il fige.
 */

/**
 * Ou un eleve doit retomber quand il rouvre une lecon.
 *
 * Regle : on reprend APRES la derniere etape reussie. Si rien n'est reussi, on
 * commence par la premiere. Si tout est reussi, on finit sur la derniere.
 *
 * Pourquoi « apres la derniere reussie » et non « a la premiere obligatoire non
 * reussie » : une etape facultative n'a pas de question, donc elle n'est
 * jamais marquee reussie. Sur une lecon ou les quatre premieres etapes sont
 * facultatives et les deux suivantes obligatoires, un eleve qui n'a rien fait
 * se retrouverait sur la cinquieme et perdrait tout le cours. De meme, la
 * regle « premiere obligatoire non reussie » renvoie un eleve qui a deja
 * travaille en arriere, alors qu'il a progresse.
 *
 * On ne peut donc pas se fier au compte des etapes reussies pour deviner la
 * position : seul l'ordre du parcours dit ou l'eleve en est.
 *
 * @param {{required: boolean, solved: boolean}[]} steps
 * @returns {number} index de depart
 */
export function indiceReprise(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return 0
  let derniereReussie = -1
  steps.forEach((s, i) => {
    if (s.solved) derniereReussie = i
  })
  if (derniereReussie === -1) return 0
  return Math.min(derniereReussie + 1, steps.length - 1)
}

/**
 * Peut-on atteindre cette etape ?
 *
 * Regle : une etape est VERROUILLEE tant qu'il reste devant elle une etape
 * obligatoire non reussie. Ni l'obligation de l'etape cible ni sa nature ne
 * changent la regle : une etape facultative posee apres du contenu obligatoire
 * se parcourt une fois ce contenu reussi, sinon on sauterait l'essentiel.
 *
 * @param {{required: boolean, solved: boolean}[]} steps
 * @param {number} target index vise
 * @returns {boolean} true si l'etape est verrouillee
 */
export function etapeVerrouillee(steps, target) {
  if (!Array.isArray(steps)) return false
  if (!Number.isInteger(target) || target < 0 || target >= steps.length) {
    return false
  }
  return steps.slice(0, target).some((s) => s.required && !s.solved)
}