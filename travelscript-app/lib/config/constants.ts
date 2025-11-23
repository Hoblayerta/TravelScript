/**
 * Application-wide constants and configuration
 */

// Network Configuration
export const NETWORK_CONFIG = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '114'),
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://coston2-api.flare.network/ext/C/rpc',
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://coston2-explorer.flare.network',
  name: 'Flare Testnet Coston2',
  nativeCurrency: {
    name: 'Coston2 Flare',
    symbol: 'C2FLR',
    decimals: 18,
  },
};

// Contract Addresses
export const CONTRACT_ADDRESSES = {
  // TravelScript contracts
  prescriptionHub: process.env.NEXT_PUBLIC_PRESCRIPTION_HUB_ADDRESS || '',
  semaphoreRegistry: process.env.NEXT_PUBLIC_SEMAPHORE_REGISTRY_ADDRESS || '',

  // EVVM contracts
  evvm: process.env.NEXT_PUBLIC_EVVM_ADDRESS || '0x37628b685c84a67cDd350D626a572857DFCcEC74',
  staking: process.env.NEXT_PUBLIC_STAKING_ADDRESS || '0x039F84BaF64F7cE5C274cDd11A800ACC7347A809',
  estimator: process.env.NEXT_PUBLIC_ESTIMATOR_ADDRESS || '0x2F17029adff2b11C234f8Eab641A77E4629B1a40',

  // Flare FDC
  fdcHub: process.env.NEXT_PUBLIC_FDC_HUB_ADDRESS || '0x1c78A073E3BD2aCa4cc327d55FB0cD4f0549B55b',
};

// FDC Configuration
export const FDC_CONFIG = {
  verifierUrl: process.env.NEXT_PUBLIC_FDC_VERIFIER_URL || 'https://fdc-verifiers-testnet.flare.network/',
  dalUrl: process.env.NEXT_PUBLIC_FDC_DAL_URL || 'https://fdc-dal-testnet.flare.network/',
  fdcHubAddress: CONTRACT_ADDRESSES.fdcHub,
  roundDuration: 90, // seconds
  attestationType: 'JsonApi',
  sourceId: 'travelscript',
};

// API Configuration
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.travelscript.health',
};

// WalletConnect / Reown AppKit
export const WALLET_CONFIG = {
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID || '',
};

// Faucet URL
export const FAUCET_URL = 'https://faucet.flare.network/coston2';

// Application Metadata
export const APP_METADATA = {
  name: 'TravelScript',
  description: 'International prescription validation with dual-doctor ZK proof verification',
  version: '1.0.0',
  url: 'https://travelscript.health',
};

// Feature Flags
export const FEATURES = {
  enableSemaphoreZKProofs: true,
  enableFDCAttestations: true,
  enableGaslessTransactions: false, // Enable when EVVM meta-transactions are implemented
  enableIPFSStorage: false, // Enable in production with real IPFS credentials
  mockMode: !CONTRACT_ADDRESSES.prescriptionHub, // Auto-enable mock mode if no contract deployed
};

// Validation Rules
export const VALIDATION_RULES = {
  minPrescriptionIdLength: 8,
  maxPrescriptionIdLength: 64,
  maxPatientNameLength: 100,
  maxMedicationLength: 200,
  maxDosageLength: 100,
  maxFrequencyLength: 100,
  maxDurationLength: 100,
  maxNotesLength: 500,
};

// Supported Countries for Doctors
export const SUPPORTED_COUNTRIES = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
];

// Error Messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet first',
  WRONG_NETWORK: 'Please switch to Flare Coston2 network',
  CONTRACT_NOT_DEPLOYED: 'PrescriptionHub contract not deployed. Please deploy first.',
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  PRESCRIPTION_NOT_FOUND: 'Prescription not found',
  INVALID_PRESCRIPTION_ID: 'Invalid prescription ID format',
  SEMAPHORE_PROOF_FAILED: 'Semaphore proof generation failed',
  FDC_ATTESTATION_FAILED: 'FDC attestation request failed',
  ALREADY_VALIDATED: 'Prescription already validated',
  NOT_VALIDATED: 'Prescription not yet validated by second doctor',
  PRESCRIPTION_REVOKED: 'Prescription has been revoked',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  PRESCRIPTION_CREATED: 'Prescription created successfully on blockchain',
  PRESCRIPTION_VALIDATED: 'Prescription validated successfully',
  PRESCRIPTION_ATTESTED: 'Prescription attested with FDC',
  PRESCRIPTION_REVOKED: 'Prescription revoked successfully',
  DOCTOR_REGISTERED: 'Doctor identity registered successfully',
};

// Explorer URLs
export function getTransactionUrl(txHash: string): string {
  return `${NETWORK_CONFIG.explorerUrl}/tx/${txHash}`;
}

export function getAddressUrl(address: string): string {
  return `${NETWORK_CONFIG.explorerUrl}/address/${address}`;
}

export function getBlockUrl(blockNumber: number): string {
  return `${NETWORK_CONFIG.explorerUrl}/block/${blockNumber}`;
}
