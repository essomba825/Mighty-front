export const nationalNumber = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.startsWith('237') && digits.length === 12) return digits.slice(3)
  return digits
}

export const isMobileNumber = (raw) => /^6\d{8}$/.test(nationalNumber(raw))

export const detectNetwork = (raw) => {
  const prefix = nationalNumber(raw).slice(0, 3)
  if (!prefix) return null
  if (/^6(5[0-4]|7[0-9]|8[0-3])/.test(prefix)) return 'MTN'
  if (/^6(5[5-9]|9[0-9])/.test(prefix)) return 'Orange'
  if (/^6(6[0-9])/.test(prefix)) return 'Nexttel'
  if (/^6(2[0-0])/.test(prefix)) return 'Camtel'
  return null
}

export const ussdCode = (method, merchantCode, amount) => {
  if (method === 'mtn_momo') return `*126*4*${merchantCode}*${amount}#`
  if (method === 'orange_money') return `#150*47*${merchantCode}*${amount}#`
  return ''
}

export const ussdTel = (method, merchantCode, amount) => {
  const code = ussdCode(method, merchantCode, amount)
  return code ? `tel:${code.replace(/#/g, '%23')}` : undefined
}