import { defineChain } from 'viem'

export const flareCoston2 = defineChain({
  id: 114,
  name: 'Flare Testnet Coston2',
  nativeCurrency: {
    decimals: 18,
    name: 'Coston2 Flare',
    symbol: 'C2FLR',
  },
  rpcUrls: {
    default: {
      http: ['https://coston2-api.flare.network/ext/C/rpc'],
      webSocket: ['wss://coston2-api.flare.network/ext/C/ws'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flare Explorer',
      url: 'https://coston2-explorer.flare.network',
    },
  },
  testnet: true,
})
