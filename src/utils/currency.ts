export const currencies = {
  BRL: {
    symbol: 'R$',
    name: 'Real Brasileiro',
    locale: 'pt-BR',
  },
  USD: {
    symbol: '$',
    name: 'Dólar Americano',
    locale: 'en-US',
  },
  EUR: {
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
  },
} as const;

export type CurrencyCode = keyof typeof currencies;

export const formatCurrency = (amount: number, currencyCode: CurrencyCode = 'BRL'): string => {
  const { locale } = currencies[currencyCode];
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
};