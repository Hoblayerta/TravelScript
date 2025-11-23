# TravelScript Medical Prescription Platform - Implementation Guide

## 🎯 Project Overview

**Problem**: International travelers cannot validate medical prescriptions across borders because doctors from one country have no way to prove their medical credentials to pharmacies in another country.

**Solution**: A decentralized platform using zero-knowledge proofs, blockchain attestation, and gasless transactions to create verifiable, privacy-preserving medical prescriptions that work globally.

## 🏗️ Architecture Stack

### Core Technologies
1. **Semaphore** - Zero-knowledge proof system for doctor identity verification
2. **Flare Network** - Data storage and attestation via FDC (Flare Data Connector)
3. **EVVM (MATE Metaprotocol)** - Gasless transaction layer for prescription metadata
4. **Reown (WalletConnect)** - User authentication and wallet connection
5. **Next.js** - Frontend framework

### Data Flow
```
Doctor Signs Prescription
    ↓
Semaphore ZK Proof (doctor identity verified without revealing personal data)
    ↓
Dual Signature (Doctor + Patient)
    ↓
Flare FDC (attestation of prescription data)
    ↓
EVVM MATE Metaprotocol (gasless metadata storage)
    ↓
Global Verification (pharmacies worldwide can verify)
```

## 🏆 Prize Qualification Matrix

| Prize Track | Requirement | Our Implementation |
|-------------|-------------|-------------------|
| **Flare Main Track** ($8k) | Use FTSO/FDC/Random/FAssets | ✅ FDC Web2Json attestation for prescription data |
| **Flare Bonus** ($2k) | External data source/cross-chain | ✅ Medical credential API + ZK proof cross-verification |
| **EVVM Best Integration** ($7k) | Use MATE Metaprotocol | ✅ Gasless prescription metadata storage |
| **EVVM Feedback** ($500) | Provide feedback | ✅ Document experience in README |
| **Reown** (if applicable) | AppKit integration | ✅ Wallet auth + signing |

**Total Potential**: $17,500+

## 📋 Implementation Steps

### Phase 1: Project Setup

#### 1.1 Initialize Next.js Project
```bash
npx create-next-app@latest travelscript-app --typescript --tailwind --app
cd travelscript-app
```

#### 1.2 Install Core Dependencies
```bash
# Semaphore ZK Proofs
npm install @semaphore-protocol/identity @semaphore-protocol/group @semaphore-protocol/proof

# Ethereum & Web3
npm install viem wagmi @reown/appkit @reown/appkit-adapter-wagmi

# Flare Network (FDC contracts and peripherals)
npm install @flarenetwork/flare-periphery-contracts @flarenetwork/flare-periphery-contract-artifacts

# EVVM (we'll deploy our own EVVM instance)
# Installation via git clone in next steps

# Additional tooling
npm install ethers axios

# UI & Utils
npm install @radix-ui/react-* class-variance-authority clsx tailwind-merge
npm install zod react-hook-form @hookform/resolvers
```

### Phase 2: Authentication Setup (Reown)

#### 2.1 Configure Reown AppKit
**File**: `src/config/reown.ts`
```typescript
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { sepolia, flareTestnet } from 'viem/chains'

// MATE Metaprotocol custom chain
export const mateChain = {
  id: 11155111, // Sepolia base
  name: 'MATE Metaprotocol',
  nativeCurrency: { name: 'MATE', symbol: 'MATE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.evvm.org'] }
  },
  blockExplorers: {
    default: { name: 'EVVM Explorer', url: 'https://explorer.evvm.org' }
  }
}

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID!

const metadata = {
  name: 'TravelScript',
  description: 'Global Medical Prescription Platform',
  url: 'https://travelscript.app',
  icons: ['https://travelscript.app/icon.png']
}

export const wagmiAdapter = new WagmiAdapter({
  chains: [sepolia, flareTestnet, mateChain],
  projectId,
  metadata
})

export const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  metadata,
  features: {
    analytics: true,
    email: true,
    socials: ['google', 'github']
  }
})
```

#### 2.2 Wrap App with Providers
**File**: `src/app/layout.tsx`
```typescript
import { headers } from 'next/headers'
import { cookieToInitialState } from 'wagmi'
import { wagmiAdapter } from '@/config/reown'
import { AppKitProvider } from '@/components/providers/appkit-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig,
    headers().get('cookie')
  )

  return (
    <html lang="en">
      <body>
        <AppKitProvider initialState={initialState}>
          {children}
        </AppKitProvider>
      </body>
    </html>
  )
}
```

**File**: `src/components/providers/appkit-provider.tsx`
```typescript
'use client'

import { WagmiProvider, State } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiAdapter } from '@/config/reown'

const queryClient = new QueryClient()

export function AppKitProvider({
  children,
  initialState
}: {
  children: React.ReactNode
  initialState?: State
}) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### Phase 3: Semaphore Integration (Doctor Identity)

#### 3.1 Setup Semaphore Group Contract
**File**: `contracts/DoctorRegistry.sol`
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";

contract DoctorRegistry {
    ISemaphore public semaphore;
    uint256 public groupId;

    mapping(uint256 => bool) public verifiedDoctors; // commitment => verified
    mapping(bytes32 => bool) public usedNullifiers;

    event DoctorVerified(uint256 indexed identityCommitment);
    event PrescriptionSigned(bytes32 indexed nullifierHash, string prescriptionId);

    constructor(address semaphoreAddress, uint256 _groupId) {
        semaphore = ISemaphore(semaphoreAddress);
        groupId = _groupId;
    }

    function addVerifiedDoctor(uint256 identityCommitment) external {
        // In production: add admin role or oracle verification
        require(!verifiedDoctors[identityCommitment], "Already verified");

        semaphore.addMember(groupId, identityCommitment);
        verifiedDoctors[identityCommitment] = true;

        emit DoctorVerified(identityCommitment);
    }

    function signPrescription(
        bytes32 nullifierHash,
        uint256[8] calldata proof,
        string calldata prescriptionId
    ) external {
        require(!usedNullifiers[nullifierHash], "Prescription already signed");

        // Verify ZK proof
        semaphore.verifyProof(groupId, proof);

        usedNullifiers[nullifierHash] = true;
        emit PrescriptionSigned(nullifierHash, prescriptionId);
    }
}
```

#### 3.2 Doctor Identity Management
**File**: `src/lib/semaphore/doctor-identity.ts`
```typescript
import { Identity } from '@semaphore-protocol/identity'
import { Group } from '@semaphore-protocol/group'
import { generateProof } from '@semaphore-protocol/proof'

export class DoctorIdentityManager {
  private identity: Identity | null = null

  // Create new doctor identity
  async createIdentity(doctorCredentials: {
    licenseNumber: string
    country: string
    specialization: string
  }): Promise<string> {
    // Generate identity from credentials
    const deterministicKey = this.hashCredentials(doctorCredentials)
    this.identity = new Identity(deterministicKey)

    // Store encrypted identity locally
    await this.storeIdentity(this.identity)

    return this.identity.commitment.toString()
  }

  // Generate ZK proof for prescription signing
  async generatePrescriptionProof(
    prescriptionData: {
      patientId: string
      medication: string
      dosage: string
      timestamp: number
    },
    group: Group
  ) {
    if (!this.identity) throw new Error('No identity loaded')

    // Create signal (hash of prescription data)
    const signal = this.hashPrescription(prescriptionData)

    // Generate proof
    const proof = await generateProof(
      this.identity,
      group,
      signal,
      prescriptionData.patientId // External nullifier
    )

    return proof
  }

  private hashCredentials(credentials: any): string {
    // Implementation: hash credentials for deterministic identity
    return '0x...'
  }

  private hashPrescription(data: any): string {
    // Implementation: create signal from prescription data
    return '0x...'
  }

  private async storeIdentity(identity: Identity) {
    // Store encrypted in localStorage or secure enclave
  }
}
```

### Phase 4: Flare Data Connector Integration

#### 4.1 FDC Attestation Client
**File**: `src/lib/flare/fdc-client.ts`
```typescript
import { ethers } from 'ethers'
import axios from 'axios'

export interface PrescriptionData {
  id: string
  doctorCommitment: string
  patientId: string
  medication: string
  dosage: string
  duration: string
  timestamp: number
  countryIssued: string
}

interface AttestationRequest {
  attestationType: string // hex encoded
  sourceId: string // hex encoded
  requestBody: {
    abi_encoded_request: string
  }
}

export class FlareFDCClient {
  private verifierUrl = 'https://fdc-verifiers-testnet.flare.network/'
  private fdcHubAddress = '0x1c78A073E3BD2aCa4cc327d55FB0cD4f0549B55b' // Coston2
  private provider: ethers.Provider

  constructor(provider: ethers.Provider) {
    this.provider = provider
  }

  // Encode attestation type to bytes32
  private encodeAttestationType(type: string): string {
    return ethers.zeroPadValue(ethers.toUtf8Bytes(type), 32)
  }

  // Encode source ID to bytes32
  private encodeSourceId(sourceId: string): string {
    return ethers.zeroPadValue(ethers.toUtf8Bytes(sourceId), 32)
  }

  // For this POC, we'll use EVMTransaction attestation instead of Web2Json
  // This is simpler and more reliable for hackathon demo
  async requestTransactionAttestation(
    txHash: string,
    sourceChain: string = 'testETH' // Sepolia
  ): Promise<string> {
    // 1. Prepare attestation request
    const attestationType = this.encodeAttestationType('EVMTransaction')
    const sourceId = this.encodeSourceId(sourceChain)

    // 2. Encode the transaction hash and required confirmations
    const abiEncodedRequest = ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint8', 'bytes32'],
      [txHash, 6, ethers.ZeroHash] // 6 confirmations required
    )

    // 3. Submit to verifier service
    const verifierRequest = {
      attestationType: attestationType,
      sourceId: sourceId,
      requestBody: {
        abi_encoded_request: abiEncodedRequest
      }
    }

    const response = await axios.post(this.verifierUrl, verifierRequest)
    const { status, response: verifierResponse } = response.data

    return verifierResponse // Merkle root or attestation proof
  }

  // Alternative: Use Web2Json for prescription data
  async attestPrescriptionData(prescription: PrescriptionData): Promise<string> {
    const attestationType = this.encodeAttestationType('Web2Json')
    const sourceId = this.encodeSourceId('travelscript')

    // Encode Web2Json request (url, path selectors)
    const prescriptionUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/prescriptions/${prescription.id}`

    const abiEncodedRequest = ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'string[]'],
      [prescriptionUrl, ['data', 'prescription']]
    )

    const verifierRequest = {
      attestationType: attestationType,
      sourceId: sourceId,
      requestBody: {
        abi_encoded_request: abiEncodedRequest
      }
    }

    try {
      const response = await axios.post(this.verifierUrl, verifierRequest)
      return response.data.response
    } catch (error) {
      console.error('FDC attestation failed:', error)
      throw error
    }
  }

  // Verify attestation proof on-chain using FDCHub
  async verifyAttestationOnChain(
    proof: any,
    attestationData: string
  ): Promise<boolean> {
    const fdcHub = new ethers.Contract(
      this.fdcHubAddress,
      [
        'function verifyAttestation(bytes calldata data) external view returns (bool)',
      ],
      this.provider
    )

    try {
      const isValid = await fdcHub.verifyAttestation(attestationData)
      return isValid
    } catch (error) {
      console.error('Verification failed:', error)
      return false
    }
  }

  // Get proof from Data Availability Layer
  async getProofFromDAL(roundId: number): Promise<any> {
    // Wait for round finalization (90-180 seconds)
    const dalUrl = `https://fdc-dal-testnet.flare.network/proof/${roundId}`

    // Poll for proof availability
    let attempts = 0
    const maxAttempts = 20

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(dalUrl)
        if (response.data.proof) {
          return response.data.proof
        }
      } catch (error) {
        // Proof not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10s
      attempts++
    }

    throw new Error('Proof not available after timeout')
  }

  // Store attestation result on-chain
  async storeAttestationOnChain(
    attestationHash: string,
    prescriptionId: string,
    contractAddress: string,
    signer: ethers.Signer
  ) {
    const registry = new ethers.Contract(
      contractAddress,
      [
        'function attestPrescription(string calldata prescriptionId, bytes32 attestationHash) external'
      ],
      signer
    )

    const tx = await registry.attestPrescription(prescriptionId, attestationHash)
    await tx.wait()

    return tx.hash
  }
}
```

#### 4.2 Prescription Storage Contract (Flare)
**File**: `contracts/FlareAttestationRegistry.sol`
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract FlareAttestationRegistry {
    struct PrescriptionAttestation {
        bytes32 attestationHash;
        address issuer;
        uint256 timestamp;
        bool revoked;
    }

    mapping(string => PrescriptionAttestation) public prescriptions;

    event PrescriptionAttested(
        string indexed prescriptionId,
        bytes32 attestationHash,
        address issuer
    );

    event PrescriptionRevoked(string indexed prescriptionId);

    function attestPrescription(
        string calldata prescriptionId,
        bytes32 attestationHash
    ) external {
        require(
            prescriptions[prescriptionId].timestamp == 0,
            "Already attested"
        );

        prescriptions[prescriptionId] = PrescriptionAttestation({
            attestationHash: attestationHash,
            issuer: msg.sender,
            timestamp: block.timestamp,
            revoked: false
        });

        emit PrescriptionAttested(prescriptionId, attestationHash, msg.sender);
    }

    function verifyPrescription(string calldata prescriptionId)
        external
        view
        returns (bool valid, bytes32 attestationHash)
    {
        PrescriptionAttestation memory att = prescriptions[prescriptionId];
        return (
            att.timestamp > 0 && !att.revoked,
            att.attestationHash
        );
    }

    function revokePrescription(string calldata prescriptionId) external {
        require(
            prescriptions[prescriptionId].issuer == msg.sender,
            "Not issuer"
        );

        prescriptions[prescriptionId].revoked = true;
        emit PrescriptionRevoked(prescriptionId);
    }
}
```

### Phase 5: Deploy Your Own EVVM on Flare Coston2

**IMPORTANT**: We'll deploy our own EVVM instance on Flare Coston2 testnet (NOT use MATE on Sepolia). This allows gasless transactions AND compatibility with Flare FDC!

#### 5.1 Clone and Setup EVVM Contracts

```bash
# Clone EVVM repository
git clone https://github.com/EVVM-org/Testnet-Contracts
cd Testnet-Contracts

# Install dependencies and compile
make install

# This will:
# - Install npm dependencies
# - Initialize git submodules
# - Compile contracts with IR optimization
```

#### 5.2 Configure Environment

```bash
# Copy environment template
cp .env.example .env
```

**Edit `.env` file**:
```bash
# Flare Coston2 Testnet
COSTON2_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
COSTON2_EXPLORER_API_KEY=  # Optional: get from https://coston2-explorer.flare.network

# Never put private keys here! We'll use cast wallet import
```

#### 5.3 Import Wallet Securely

```bash
# Import your testnet private key (will prompt for password)
cast wallet import defaultKey --interactive

# Paste your private key when prompted
# Set a strong password
```

#### 5.4 Get Flare Coston2 Testnet Tokens

Visit the Flare faucet and get C2FLR tokens:
```
https://faucet.flare.network/coston2
```

You'll need ~5-10 C2FLR for deployment.

#### 5.5 Deploy EVVM to Flare Coston2

**Option A: Interactive Wizard (Recommended)**

```bash
npm run wizard

# Follow the prompts:
# 1. Select network: Custom RPC
# 2. Enter RPC URL: https://coston2-api.flare.network/ext/C/rpc
# 3. Enter Chain ID: 114
# 4. Select wallet: defaultKey
# 5. Confirm deployment
# 6. Wait for verification
```

**Option B: Manual Deployment**

First, add Flare Coston2 to `foundry.toml`:

```toml
[profile.coston2]
src = "src"
out = "out"
libs = ["lib"]
via_ir = true
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
coston2 = "https://coston2-api.flare.network/ext/C/rpc"

[etherscan]
coston2 = { key = "${COSTON2_EXPLORER_API_KEY}", url = "https://coston2-explorer.flare.network/api" }
```

Then deploy:

```bash
# Deploy EVVM core contracts to Flare Coston2
forge script script/DeployEVVM.s.sol:DeployEVVM \
  --rpc-url coston2 \
  --account defaultKey \
  --sender YOUR_ADDRESS \
  --broadcast \
  --verify

# Save the deployed EVVM address!
# Example output:
# ✅ EVVM deployed at: 0x1234567890abcdef...
```

#### 5.6 EVVM Client Integration

**File**: `src/lib/evvm/evvm-client.ts`

```typescript
import { ethers } from 'ethers'

export interface EVVMConfig {
  evvmAddress: string // Your deployed EVVM address
  chainId: 114 // Flare Coston2
  rpcUrl: string
}

export class EVVMClient {
  private evvmAddress: string
  private provider: ethers.Provider
  private signer?: ethers.Signer

  constructor(config: EVVMConfig, signer?: ethers.Signer) {
    this.evvmAddress = config.evvmAddress
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl)
    this.signer = signer
  }

  // Submit gasless transaction to EVVM
  async submitGaslessTransaction(
    from: string,
    to: string,
    data: string,
    value: bigint = 0n
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for gasless transactions')
    }

    const evvm = new ethers.Contract(
      this.evvmAddress,
      [
        'function executeMetaTransaction(address from, address to, bytes calldata data, uint256 value, uint256 nonce, bytes calldata signature) external returns (bytes memory)',
        'function getNonce(address user) external view returns (uint256)'
      ],
      this.signer
    )

    // Get user's nonce
    const nonce = await evvm.getNonce(from)

    // Create signature for meta-transaction
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'address', 'bytes', 'uint256', 'uint256'],
      [from, to, data, value, nonce]
    )

    const signature = await this.signer.signMessage(
      ethers.getBytes(messageHash)
    )

    // Execute gasless transaction
    const tx = await evvm.executeMetaTransaction(
      from,
      to,
      data,
      value,
      nonce,
      signature
    )

    await tx.wait()
    return tx.hash
  }

  // Store prescription metadata (gasless)
  async storePrescriptionMetadata(
    prescriptionId: string,
    metadata: {
      doctorCommitment: string
      patientHash: string
      medicationHash: string
      flareAttestationHash: string
    },
    userAddress: string
  ): Promise<string> {
    // Encode metadata storage call
    const metadataContract = process.env.NEXT_PUBLIC_EVVM_METADATA!

    const iface = new ethers.Interface([
      'function storeMetadata(string prescriptionId, bytes32 doctorCommitment, bytes32 patientHash, bytes32 medicationHash, bytes32 flareAttestationHash) external'
    ])

    const data = iface.encodeFunctionData('storeMetadata', [
      prescriptionId,
      metadata.doctorCommitment,
      metadata.patientHash,
      metadata.medicationHash,
      metadata.flareAttestationHash
    ])

    // Submit as gasless transaction
    return await this.submitGaslessTransaction(
      userAddress,
      metadataContract,
      data
    )
  }

  // Retrieve prescription metadata
  async getPrescriptionMetadata(prescriptionId: string): Promise<any> {
    const metadataContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_EVVM_METADATA!,
      [
        'function getMetadata(string prescriptionId) external view returns (bytes32, bytes32, bytes32, bytes32, uint256, bool)'
      ],
      this.provider
    )

    const result = await metadataContract.getMetadata(prescriptionId)

    return {
      doctorCommitment: result[0],
      patientHash: result[1],
      medicationHash: result[2],
      flareAttestationHash: result[3],
      timestamp: result[4],
      active: result[5]
    }
  }
}
```

#### 5.2 Prescription Metadata Contract (EVVM)
**File**: `contracts/EVVMPrescriptionMetadata.sol`
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract EVVMPrescriptionMetadata {
    struct Metadata {
        bytes32 doctorCommitment;
        bytes32 patientHash;
        bytes32 medicationHash;
        bytes32 flareAttestationHash;
        uint256 timestamp;
        bool active;
    }

    mapping(string => Metadata) public prescriptionMetadata;
    mapping(address => bool) public authorizedExecutors;

    event MetadataStored(string indexed prescriptionId, address executor);
    event MetadataUpdated(string indexed prescriptionId);

    modifier onlyExecutor() {
        require(authorizedExecutors[msg.sender], "Not authorized executor");
        _;
    }

    function authorizeExecutor(address executor) external {
        // In production: add proper access control
        authorizedExecutors[executor] = true;
    }

    // Gasless metadata storage (called by executor)
    function storeMetadata(
        string calldata prescriptionId,
        bytes32 doctorCommitment,
        bytes32 patientHash,
        bytes32 medicationHash,
        bytes32 flareAttestationHash
    ) external onlyExecutor {
        prescriptionMetadata[prescriptionId] = Metadata({
            doctorCommitment: doctorCommitment,
            patientHash: patientHash,
            medicationHash: medicationHash,
            flareAttestationHash: flareAttestationHash,
            timestamp: block.timestamp,
            active: true
        });

        emit MetadataStored(prescriptionId, msg.sender);
    }

    function getMetadata(string calldata prescriptionId)
        external
        view
        returns (Metadata memory)
    {
        return prescriptionMetadata[prescriptionId];
    }

    function deactivateMetadata(string calldata prescriptionId)
        external
        onlyExecutor
    {
        prescriptionMetadata[prescriptionId].active = false;
        emit MetadataUpdated(prescriptionId);
    }
}
```

### Phase 6: Frontend Implementation

#### 6.1 Doctor Dashboard
**File**: `src/app/doctor/page.tsx`
```typescript
'use client'

import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { DoctorIdentityManager } from '@/lib/semaphore/doctor-identity'
import { FlareFDCClient } from '@/lib/flare/fdc-client'
import { MATEClient } from '@/lib/evvm/mate-config'

export default function DoctorDashboard() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [prescription, setPrescription] = useState({
    patientId: '',
    medication: '',
    dosage: '',
    duration: ''
  })

  const identityManager = new DoctorIdentityManager()
  const fdcClient = new FlareFDCClient()
  const mateClient = new MATEClient()

  const handleCreatePrescription = async () => {
    if (!isConnected) return

    try {
      // 1. Generate prescription ID
      const prescriptionId = generatePrescriptionId()

      // 2. Generate Semaphore proof
      const proof = await identityManager.generatePrescriptionProof(
        {
          patientId: prescription.patientId,
          medication: prescription.medication,
          dosage: prescription.dosage,
          timestamp: Date.now()
        },
        doctorGroup // Load from contract
      )

      // 3. Sign prescription with both doctor and patient
      const doctorSignature = await signMessageAsync({
        message: prescriptionId
      })

      const patientSignature = await requestPatientSignature(
        prescriptionId,
        prescription.patientId
      )

      // 4. Store on Flare via FDC
      const attestationHash = await fdcClient.attestPrescription({
        id: prescriptionId,
        doctorCommitment: proof.publicSignals.commitment,
        patientId: prescription.patientId,
        medication: prescription.medication,
        dosage: prescription.dosage,
        duration: prescription.duration,
        timestamp: Date.now(),
        countryIssued: 'AR'
      })

      // 5. Store metadata gaslessly on EVVM
      await mateClient.submitGaslessMetadata(
        prescriptionId,
        {
          doctorCommitment: proof.publicSignals.commitment,
          patientHash: hashPatientId(prescription.patientId),
          medicationHash: hashMedication(prescription.medication),
          flareAttestationHash: attestationHash
        },
        address! // Executor address
      )

      // 6. Register human-readable name
      await mateClient.registerPrescriptionName(
        prescriptionId,
        `${prescription.patientId}-${prescription.medication}`
      )

      alert('Prescription created successfully!')
    } catch (error) {
      console.error('Error creating prescription:', error)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Doctor Dashboard</h1>

      {!isConnected ? (
        <button className="btn-primary">Connect Wallet</button>
      ) : (
        <form className="space-y-4">
          <input
            type="text"
            placeholder="Patient ID"
            value={prescription.patientId}
            onChange={(e) => setPrescription({...prescription, patientId: e.target.value})}
            className="input"
          />

          <input
            type="text"
            placeholder="Medication"
            value={prescription.medication}
            onChange={(e) => setPrescription({...prescription, medication: e.target.value})}
            className="input"
          />

          <input
            type="text"
            placeholder="Dosage"
            value={prescription.dosage}
            onChange={(e) => setPrescription({...prescription, dosage: e.target.value})}
            className="input"
          />

          <input
            type="text"
            placeholder="Duration"
            value={prescription.duration}
            onChange={(e) => setPrescription({...prescription, duration: e.target.value})}
            className="input"
          />

          <button
            type="button"
            onClick={handleCreatePrescription}
            className="btn-primary"
          >
            Create Prescription
          </button>
        </form>
      )}
    </div>
  )
}
```

#### 6.2 Pharmacy Verification Portal
**File**: `src/app/pharmacy/page.tsx`
```typescript
'use client'

import { useState } from 'react'
import { FlareFDCClient } from '@/lib/flare/fdc-client'
import { MATEClient } from '@/lib/evvm/mate-config'

export default function PharmacyPortal() {
  const [prescriptionId, setPrescriptionId] = useState('')
  const [verificationResult, setVerificationResult] = useState<any>(null)

  const fdcClient = new FlareFDCClient()
  const mateClient = new MATEClient()

  const handleVerify = async () => {
    try {
      // 1. Get metadata from EVVM
      const metadata = await mateClient.evvm.call({
        to: MATE_CONFIG.evvmAddress,
        data: encodeGetMetadata(prescriptionId)
      })

      // 2. Verify Flare attestation
      const isValid = await fdcClient.verifyAttestation(
        metadata.flareAttestationHash
      )

      // 3. Verify Semaphore proof (doctor was verified)
      const doctorVerified = await verifyDoctorCommitment(
        metadata.doctorCommitment
      )

      setVerificationResult({
        valid: isValid && doctorVerified,
        metadata,
        timestamp: new Date(metadata.timestamp * 1000).toLocaleString()
      })
    } catch (error) {
      console.error('Verification failed:', error)
      setVerificationResult({ valid: false })
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Pharmacy Verification</h1>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Enter Prescription ID"
          value={prescriptionId}
          onChange={(e) => setPrescriptionId(e.target.value)}
          className="input w-full"
        />

        <button onClick={handleVerify} className="btn-primary">
          Verify Prescription
        </button>

        {verificationResult && (
          <div className={`p-6 rounded-lg ${
            verificationResult.valid ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <h2 className="text-xl font-bold mb-4">
              {verificationResult.valid ? '✅ Valid Prescription' : '❌ Invalid'}
            </h2>

            {verificationResult.valid && (
              <div className="space-y-2">
                <p>Doctor: Verified (ZK Proof)</p>
                <p>Patient: {verificationResult.metadata.patientHash}</p>
                <p>Medication: {verificationResult.metadata.medicationHash}</p>
                <p>Issued: {verificationResult.timestamp}</p>
                <p>Attestation: {verificationResult.metadata.flareAttestationHash}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

### Phase 7: Deployment & Testing

#### 7.1 Contract Deployment Script
**File**: `scripts/deploy.ts`
```typescript
import { ethers } from 'hardhat'

async function main() {
  // 1. Deploy to Sepolia (for Flare attestation registry)
  const FlareRegistry = await ethers.getContractFactory('FlareAttestationRegistry')
  const flareRegistry = await FlareRegistry.deploy()
  await flareRegistry.deployed()
  console.log('Flare Registry deployed to:', flareRegistry.address)

  // 2. Deploy to Semaphore
  const DoctorRegistry = await ethers.getContractFactory('DoctorRegistry')
  const doctorRegistry = await DoctorRegistry.deploy(
    SEMAPHORE_ADDRESS,
    DOCTOR_GROUP_ID
  )
  await doctorRegistry.deployed()
  console.log('Doctor Registry deployed to:', doctorRegistry.address)

  // 3. Deploy to EVVM MATE Metaprotocol
  const EVVMMetadata = await ethers.getContractFactory('EVVMPrescriptionMetadata')
  const evvmMetadata = await EVVMMetadata.deploy()
  await evvmMetadata.deployed()
  console.log('EVVM Metadata deployed to:', evvmMetadata.address)

  // 4. Save addresses
  const addresses = {
    flareRegistry: flareRegistry.address,
    doctorRegistry: doctorRegistry.address,
    evvmMetadata: evvmMetadata.address
  }

  await fs.writeFile(
    'deployed-addresses.json',
    JSON.stringify(addresses, null, 2)
  )
}

main()
```

#### 7.2 Environment Variables
**File**: `.env.local`
```bash
# Reown (WalletConnect)
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id

# Flare
NEXT_PUBLIC_FDC_PROVIDER=https://fdc-api.flare.network
NEXT_PUBLIC_FLARE_RPC=https://coston2-api.flare.network/ext/C/rpc

# EVVM MATE
NEXT_PUBLIC_MATE_EVVM_ADDRESS=0xF817e9ad82B4a19F00dA7A248D9e556Ba96e6366
NEXT_PUBLIC_MATE_STAKING=0x8eB2525239781e06dBDbd95d83c957C431CF2321
NEXT_PUBLIC_MATE_NAMESERVICE=0x8038e87dc67D87b31d890FD01E855a8517ebfD24

# API
NEXT_PUBLIC_API_URL=https://api.travelscript.app

# Contract Addresses (after deployment)
NEXT_PUBLIC_DOCTOR_REGISTRY=0x...
NEXT_PUBLIC_FLARE_REGISTRY=0x...
NEXT_PUBLIC_EVVM_METADATA=0x...
```

### Phase 8: Testing Strategy

#### 8.1 Integration Tests
**File**: `test/integration.test.ts`
```typescript
import { expect } from 'chai'
import { DoctorIdentityManager } from '../src/lib/semaphore/doctor-identity'
import { FlareFDCClient } from '../src/lib/flare/fdc-client'
import { MATEClient } from '../src/lib/evvm/mate-config'

describe('TravelScript Integration', () => {
  it('should create and verify prescription end-to-end', async () => {
    // 1. Create doctor identity
    const doctorManager = new DoctorIdentityManager()
    const commitment = await doctorManager.createIdentity({
      licenseNumber: 'DOC-12345',
      country: 'AR',
      specialization: 'General Medicine'
    })

    // 2. Generate prescription proof
    const proof = await doctorManager.generatePrescriptionProof({
      patientId: 'patient-123',
      medication: 'Amoxicillin',
      dosage: '500mg',
      timestamp: Date.now()
    }, doctorGroup)

    expect(proof).to.exist

    // 3. Attest on Flare
    const fdcClient = new FlareFDCClient()
    const attestationHash = await fdcClient.attestPrescription({
      id: 'rx-001',
      doctorCommitment: commitment,
      patientId: 'patient-123',
      medication: 'Amoxicillin',
      dosage: '500mg',
      duration: '7 days',
      timestamp: Date.now(),
      countryIssued: 'AR'
    })

    expect(attestationHash).to.be.a('string')

    // 4. Store on EVVM
    const mateClient = new MATEClient()
    const tx = await mateClient.submitGaslessMetadata(
      'rx-001',
      {
        doctorCommitment: commitment,
        patientHash: hashPatientId('patient-123'),
        medicationHash: hashMedication('Amoxicillin'),
        flareAttestationHash: attestationHash
      },
      executorAddress
    )

    expect(tx).to.exist

    // 5. Verify from pharmacy perspective
    const isValid = await fdcClient.verifyAttestation(attestationHash)
    expect(isValid).to.be.true
  })
})
```

## 🎯 Prize Qualification Checklist

### Flare Main Track ($8,000)
- ✅ Use FDC Web2Json attestation for prescription data verification
- ✅ Store attestation hashes on Flare smart contract
- ✅ Implement external data source (medical credential API)
- ✅ Add comprehensive feedback in README

### Flare Bonus Track ($2,000)
- ✅ External data source: Medical credential verification API
- ✅ Cross-chain application: Semaphore ZK proofs + Flare attestation + EVVM storage
- ✅ Provide API documentation link

### EVVM Best Integration ($7,000)
- ✅ Use MATE Metaprotocol on Sepolia
- ✅ Implement async nonces for gasless transactions
- ✅ Integrate MATE NameService for prescription naming
- ✅ Use executor pattern for transaction submission

### EVVM Feedback ($500)
- ✅ Document experience with EVVM tooling
- ✅ Provide feedback on MATE Metaprotocol design
- ✅ Suggest improvements for developer experience

## 📊 Technical Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     TravelScript Platform                    │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
        ┌───────▼──────┐ ┌───▼────┐ ┌──────▼──────┐
        │   Reown Auth │ │ Doctor │ │   Pharmacy  │
        │  (WalletKit) │ │   UI   │ │  Verify UI  │
        └───────┬──────┘ └───┬────┘ └──────┬──────┘
                │            │              │
        ┌───────▼────────────▼──────────────▼───────┐
        │         Next.js Application Layer          │
        └───┬────────────┬──────────────┬────────┬──┘
            │            │              │        │
    ┌───────▼──────┐ ┌──▼──────────┐ ┌─▼─────┐ │
    │  Semaphore   │ │    Flare    │ │ EVVM  │ │
    │  ZK Proofs   │ │     FDC     │ │ MATE  │ │
    │              │ │ Attestation │ │Gasless│ │
    │ • Identity   │ │             │ │  Tx   │ │
    │ • Group      │ │ • Web2Json  │ │       │ │
    │ • Proof Gen  │ │ • Verify    │ │ • NS  │ │
    └──────────────┘ └─────────────┘ └───────┘ │
                                                │
                                        ┌───────▼────────┐
                                        │  Smart         │
                                        │  Contracts     │
                                        │                │
                                        │ • Doctor Reg   │
                                        │ • Flare Attest │
                                        │ • EVVM Meta    │
                                        └────────────────┘
```

## 🚀 Quick Start Commands

```bash
# 1. Clone and install
git clone <repo>
cd travelscript-app
npm install

# 2. Get MATE tokens (testnet)
# Visit: https://evvm.dev or Telegram: https://t.me/EVVMorg

# 3. Setup environment
cp .env.example .env.local
# Fill in your Reown project ID and other variables

# 4. Deploy contracts
npx hardhat run scripts/deploy.ts --network sepolia

# 5. Run development server
npm run dev

# 6. Run tests
npm test
```

## 📝 Feedback for EVVM (Required for $500 Prize)

### Developer Experience
- **Strengths**: Gasless transaction model significantly reduces user friction
- **Improvements Needed**: More comprehensive SDK documentation with real-world examples
- **MATE NameService**: Excellent UX improvement, needs more tutorials
- **Async Nonces**: Powerful feature but needs clearer implementation guides

### Documentation Gaps
1. End-to-end integration examples
2. Error handling best practices
3. Production deployment guides
4. Security audit guidelines

### Feature Requests
1. Built-in relayer/executor service
2. Transaction batching utilities
3. Gas estimation tools for executor planning
4. Integration templates for common use cases

## 🎓 Learning Resources

- [Semaphore Documentation](https://docs.semaphore.pse.dev/)
- [Flare FDC Guide](https://dev.flare.network/fdc/overview)
- [EVVM Telegram](https://t.me/EVVMorg)
- [Reown Docs](https://docs.reown.com/mcp)

## 🏆 Submission Checklist

- [ ] Working demo deployed
- [ ] All technologies integrated (Semaphore, Flare, EVVM, Reown)
- [ ] Comprehensive README with feedback
- [ ] Video demo (< 3 minutes)
- [ ] Source code on GitHub
- [ ] Deployed contracts verified
- [ ] Test coverage > 70%
- [ ] Documentation complete

## 📧 Support

- EVVM: https://t.me/EVVMorg
- Project Issues: [GitHub Issues]
- Demo: [Deployment URL]

---

**Built for ETHGlobal Buenos Aires Hackathon**
