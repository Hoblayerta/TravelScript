/**
 * Flare Coston2 Network Configuration for AppKit
 */

import { Chain } from '@reown/appkit/networks';

export const flareCoston2: Chain = {
  id: 114,
  name: 'Flare Testnet Coston2',
  network: 'coston2',
  nativeCurrency: {
    name: 'Coston2 Flare',
    symbol: 'C2FLR',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://coston2-api.flare.network/ext/C/rpc'],
      webSocket: ['wss://coston2-api.flare.network/ext/C/ws'],
    },
    public: {
      http: ['https://coston2-api.flare.network/ext/C/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Coston2 Explorer',
      url: 'https://coston2-explorer.flare.network',
    },
  },
  testnet: true,
  chainNamespace: 'eip155',
};

// Contract addresses on Flare Coston2
export const FLARE_CONTRACT_ADDRESSES = {
  // EVVM addresses
  evvm: '0x37628b685c84a67cDd350D626a572857DFCcEC74',
  staking: '0x039F84BaF64F7cE5C274cDd11A800ACC7347A809',
  estimator: '0x2F17029adff2b11C234f8Eab641A77E4629B1a40',
  nameService: '0xd9A361f89B8697D21E9b780a4A181D1A97a140Dc',
  treasury: '0x9879fb6b778Ad9DB01CCDD1Df5fec00597F14eCF',
  p2pSwap: '0x3d55dE758aE4C767E63bB3A353cf4fB93ecdB19E',

  // Flare FDC
  fdcHub: '0x1c78A073E3BD2aCa4cc327d55FB0cD4f0549B55b',

  // TravelScript contracts (update after deployment)
  prescriptionHub: process.env.NEXT_PUBLIC_PRESCRIPTION_HUB_ADDRESS || '',
  semaphoreRegistry: process.env.NEXT_PUBLIC_SEMAPHORE_REGISTRY_ADDRESS || '',
};

// Faucet URL
export const FLARE_FAUCET_URL = 'https://faucet.flare.network/coston2';
