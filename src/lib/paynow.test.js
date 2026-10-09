import { describe, expect, it } from 'vitest'

import { detectNetwork, isMobileNumber, nationalNumber, ussdCode, ussdTel } from './paynow'

describe('nationalNumber', () => {
  it('normalise les numéros camerounais', () => {
    expect(nationalNumber('690000000')).toBe('690000000')
    expect(nationalNumber('+237690000000')).toBe('690000000')
    expect(nationalNumber('237690000000')).toBe('690000000')
    expect(nationalNumber('690 00 00 00')).toBe('690000000')
  })

  it('laisse un numéro non 237 tel quel', () => {
    expect(nationalNumber('+33612345678')).toBe('33612345678')
  })
})

describe('isMobileNumber', () => {
  it('accepte un numéro Mobile Money camerounais', () => {
    expect(isMobileNumber('690000000')).toBe(true)
    expect(isMobileNumber('+237690000000')).toBe(true)
    expect(isMobileNumber('237 690 00 00 00')).toBe(true)
    expect(isMobileNumber('650123456')).toBe(true)
  })

  it('refuse un numéro invalide', () => {
    expect(isMobileNumber('512345678')).toBe(false)
    expect(isMobileNumber('69000000')).toBe(false)
    expect(isMobileNumber('6900000000')).toBe(false)
    expect(isMobileNumber('')).toBe(false)
    expect(isMobileNumber('abc')).toBe(false)
  })
})

describe('detectNetwork', () => {
  it('détecte MTN (650-654, 670-679, 680-683)', () => {
    expect(detectNetwork('650123456')).toBe('MTN')
    expect(detectNetwork('654000000')).toBe('MTN')
    expect(detectNetwork('670000000')).toBe('MTN')
    expect(detectNetwork('679000000')).toBe('MTN')
    expect(detectNetwork('683000000')).toBe('MTN')
  })

  it('détecte Orange (655-659, 690-699)', () => {
    for (const pre of ['655', '659', '690', '699']) {
      expect(detectNetwork(`${pre}000000`)).toBe('Orange')
    }
  })

  it('détecte Nexttel (660-669) et Camtel (620)', () => {
    expect(detectNetwork('660000000')).toBe('Nexttel')
    expect(detectNetwork('669000000')).toBe('Nexttel')
    expect(detectNetwork('620000000')).toBe('Camtel')
  })

  it('laisse un préfixe inconnu sans opérateur', () => {
    expect(detectNetwork('612345678')).toBeNull()
    expect(detectNetwork('630000000')).toBeNull()
    expect(detectNetwork('')).toBeNull()
  })
})

describe('ussdCode / ussdTel', () => {
  it('compose le code MTN Mobile Money', () => {
    expect(ussdCode('mtn_momo', '1234567', 2500)).toBe('*126*4*1234567*2500#')
  })

  it('compose le code Orange Money', () => {
    expect(ussdCode('orange_money', '7654321', 500)).toBe('#150*47*7654321*500#')
  })

  it('ne produit rien hors mobile money', () => {
    expect(ussdCode('bank', '1', 500)).toBe('')
    expect(ussdTel('bank', '1', 500)).toBeUndefined()
  })

  it('encode le dièse pour le lien tel:', () => {
    expect(ussdTel('mtn_momo', '1234567', 500)).toBe('tel:*126*4*1234567*500%23')
  })
})