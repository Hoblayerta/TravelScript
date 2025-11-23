"use client";

import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { defineChain } from "@reown/appkit/networks";

// Define Flare Coston2 (Chain ID 114)
const flareCoston2 = defineChain({
  id: 114,
  caipNetworkId: 'eip155:114',
  chainNamespace: 'eip155',
  name: 'Flare Testnet Coston2',
  nativeCurrency: {
    decimals: 18,
    name: 'Coston2 Flare',
    symbol: 'C2FLR',
  },
  rpcUrls: {
    default: {
      http: ['https://coston2-api.flare.network/ext/C/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flare Explorer',
      url: 'https://coston2-explorer.flare.network',
      apiUrl: 'https://coston2-explorer.flare.network/api'
    },
  },
  contracts: {},
  testnet: true,
});

// Get projectId from https://dashboard.reown.com
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "";

if (!projectId) {
  throw new Error("NEXT_PUBLIC_PROJECT_ID is not defined");
}

// Metadata
const metadata = {
  name: "TravelScript",
  description: "Global Medical Prescription Platform",
  url: "https://travelscript.app",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// Create AppKit instance
createAppKit({
  adapters: [new EthersAdapter()],
  metadata: metadata,
  networks: [flareCoston2],
  defaultNetwork: flareCoston2,
  projectId,
  features: {
    analytics: false,
    email: true,
    socials: ["google", "github", "discord"],
    emailShowWallets: true,
  },
});

export function AppKitProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
