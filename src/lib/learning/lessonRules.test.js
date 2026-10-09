import { describe, expect, it } from 'vitest'

import { etapeVerrouillee, indiceReprise } from './lessonRules'

/**
 * Ces tests sont ecrits a partir des regles enonces dans lessonRules.js, pas
 * a partir du code. C'est la seule facon qu'ils servent a quelque chose : un
 * test qui recopie l'implementation ne protege que le defaut qu'il fige — ce
 * qui est deja arrive deux fois ici (la reprise, puis le verrouillage des
 * etapes facultatives).
 */

/** Dispose la lecon 15 : 4 facultatives, 2 obligatoires, 1 facultative. */
function lecon15(solvees = []) {
  return [1, 2, 3, 4, 5, 6, 7].map((order) => ({
    order,
    required: order === 5 || order === 6,
    solved: solvees.includes(order),
  }))
}

/** La lecon 18 : toutes ses etapes sont obligatoires. */
function lecon18(solvees = []) {
  return [1, 2, 3, 4, 5, 6].map((order) => ({
    order,
    required: true,
    solved: solvees.includes(order),
  }))
}

describe('indiceReprise', () => {
  it('lecon jamais commencee : reprend a la premiere etape', () => {
    // On ne saute pas le cours pour atterrir sur une etape obligatoire.
    expect(indiceReprise(lecon15())).toBe(0)
    expect(indiceReprise(lecon18())).toBe(0)
  })

  it('une etape reussie : reprend a celle d apres', () => {
    expect(indiceReprise(lecon15([5]))).toBe(5)
    expect(indiceReprise(lecon18([1]))).toBe(1)
  })

  it('plusieurs etapes reussies : reprend apres la derniere', () => {
    expect(indiceReprise(lecon15([5, 6]))).toBe(6)
    expect(indiceReprise(lecon18([1, 2, 3]))).toBe(3)
  })

  it('lecon terminee : aboutit a la derniere etape, pas a la premiere', () => {
    // Regression : la reprise cherchait la premiere etape DEJA reussie, donc
    // un eleve qui avait fini revenait au debut du parcours.
    expect(indiceReprise(lecon15([5, 6]))).toBe(6)
    expect(indiceReprise(lecon18([1, 2, 3, 4, 5, 6]))).toBe(5)
  })

  it('lecon sans aucune etape obligatoire : on commence par la premiere', () => {
    const steps = [1, 2, 3].map((order) => ({
      order,
      required: false,
      solved: false,
    }))
    expect(indiceReprise(steps)).toBe(0)
  })

  it('lecon sans etape obligatoire mais avec une etape reussie : apres elle', () => {
    const steps = [
      { order: 1, required: false, solved: true },
      { order: 2, required: false, solved: false },
    ]
    expect(indiceReprise(steps)).toBe(1)
  })

  it('liste vide : renvoie 0 sans planter', () => {
    expect(indiceReprise([])).toBe(0)
  })
})

describe('etapeVerrouillee', () => {
  it('etape obligatoire non reussie : bloque tout ce qui suit', () => {
    // C'est la regle centrale : on ne depasse pas du contenu obligatoire.
    const steps = lecon15()
    expect(etapeVerrouillee(steps, 4)).toBe(false) // 1re obligatoire
    expect(etapeVerrouillee(steps, 5)).toBe(true) // la suivante, obligatoire
    expect(etapeVerrouillee(steps, 6)).toBe(true) // la facultative apres
  })

  it('etape obligatoire ratee : la suivante reste verrouillee', () => {
    const steps = lecon15() // 5 non reussie
    expect(steps[4].solved).toBe(false)
    expect(etapeVerrouillee(steps, 6)).toBe(true)
  })

  it('etape obligatoire reussie : la suivante se debloque', () => {
    expect(etapeVerrouillee(lecon15([5]), 5)).toBe(false)
  })

  it('toutes les obligatoires reussies : la facultative suivante s ouvre', () => {
    const steps = lecon15([5, 6])
    expect(etapeVerrouillee(steps, 6)).toBe(false)
  })

  it('etape facultative avant toute obligatoire : libre', () => {
    expect(etapeVerrouillee(lecon15(), 0)).toBe(false)
    expect(etapeVerrouillee(lecon15(), 3)).toBe(false)
  })

  it('une seule obligatoire ratee : tout ce qui suit reste bloque', () => {
    // Regression : l'ancien code laissait accessibles les etapes facultatives
    // posees apres une obligatoire non reussie — on pouvait sauter le cours.
    // Puis, une fois le travail fini, il les bloquait a l'inverse.
    const steps = lecon15([5]) // 6 ratee
    expect(etapeVerrouillee(steps, 6)).toBe(true)
  })

  it('lecon entierement obligatoire : verrouillage strict', () => {
    const steps = lecon18([1, 2])
    expect(etapeVerrouillee(steps, 3)).toBe(true)
    expect(etapeVerrouillee(lecon18([1, 2, 3]), 4)).toBe(true)
    // La derniere reste bloquee tant que la precedente n'est pas reussie.
    expect(etapeVerrouillee(lecon18([1, 2, 3, 4]), 5)).toBe(true)
    // Et se libere des que tout le parcours obligatoire est fait.
    expect(etapeVerrouillee(lecon18([1, 2, 3, 4, 5]), 5)).toBe(false)
  })

  it('cible hors limites : jamais verrouillee', () => {
    const steps = lecon15()
    expect(etapeVerrouillee(steps, -1)).toBe(false)
    expect(etapeVerrouillee(steps, 99)).toBe(false)
    expect(etapeVerrouillee(steps, 1.5)).toBe(false)
  })

  it('liste vide : jamais verrouillee', () => {
    expect(etapeVerrouillee([], 0)).toBe(false)
  })
})