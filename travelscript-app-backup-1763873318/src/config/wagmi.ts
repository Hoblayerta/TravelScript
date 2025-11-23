'use client'

import { cookieStorage, createStorage, http } from 'wagmi'
import { flareCoston2 } from './chains'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { QueryClient } from '@tanstack/react-query'

export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID!

if (!projectId) {
  throw new Error('NEXT_PUBLIC_REOWN_PROJECT_ID is not set')
}

export const queryClient = new QueryClient()

const metadata = {
  name: 'TravelScript',
  description: 'Global Medical Prescription Platform',
  url: 'https://travelscript.app',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks: [flareCoston2],
  transports: {
    [flareCoston2.id]: http()
  },
  connectors: []
})

export const config = wagmiAdapter.wagmiConfig

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [flareCoston2],
  defaultNetwork: flareCoston2,
  metadata,
  features: {
    analytics: false,
    email: true,
    socials: ['google', 'github', 'discord'],
    emailShowWallets: true,
  },
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#FF6B6B',
    '--w3m-border-radius-master': '2px'
  }
})
