
# TravelScript: Cross-Border Prescriptions - 6-Hour Implementation Guide

## Core Architecture (Flare + EVVM + Semaphore)

```typescript
// app/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

## 1. Quick Setup - Wallet & Providers

```typescript
// components/providers.tsx
'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/lib/wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

```typescript
// lib/wagmi.ts
import { createConfig, http } from 'wagmi'
import { flare, sepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [flare, sepolia],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    }),
  ],
  transports: {
    [flare.id]: http(),
    [sepolia.id]: http(),
  },
})
```

## 2. Semaphore Doctor Identity

```typescript
// lib/semaphore.ts
import { Group, Identity } from '@semaphore-protocol/identity'
import { generateProof } from '@semaphore-protocol/proof'

export class TravelScriptSemaphore {
  private group: Group
  private doctorIdentity: Identity | null = null

  constructor(groupId: string) {
    this.group = new Group(groupId)
  }

  async createDoctorIdentity(): Promise<Identity> {
    this.doctorIdentity = new Identity()
    await this.group.addMember(this.doctorIdentity.commitment)
    return this.doctorIdentity
  }

  async signPrescription(prescriptionHash: string): Promise<string> {
    if (!this.doctorIdentity) throw new Error('No doctor identity')
    
    const externalNullifier = `travelscript-${Date.now()}`
    const signal = prescriptionHash
    
    const proof = await generateProof(
      this.doctorIdentity,
      this.group,
      externalNullifier,
      signal
    )
    
    return JSON.stringify(proof)
  }

  getDoctorCommitment(): string {
    return this.doctorIdentity?.commitment.toString() || ''
  }
}
```

## 3. Flare FDC Integration

```typescript
// lib/flare.ts
import { Contract } from 'ethers'

export class TravelScriptFlare {
  private fdcContract: Contract

  constructor(provider: any, fdcAddress: string) {
    this.fdcContract = new Contract(
      fdcAddress,
      ['function submitDataRequest(bytes32,bytes,uint256,uint256) external'],
      provider
    )
  }

  async storeDoctorSignature(
    prescriptionId: string,
    semaphoreProof: string
  ): Promise<void> {
    const data = JSON.stringify({
      prescriptionId,
      semaphoreProof,
      timestamp: Date.now()
    })

    const tx = await this.fdcContract.submitDataRequest(
      prescriptionId,
      data,
      Date.now(),
      0
    )
    await tx.wait()
  }

  async retrieveDoctorSignature(prescriptionId: string): Promise<any> {
    // Simplified retrieval - in production, use proper FDC methods
    return {
      prescriptionId,
      semaphoreProof: 'stored-proof',
      timestamp: Date.now()
    }
  }
}
```

## 4. EVVM Gasless Prescription Registry

```typescript
// lib/evvm.ts
import { Contract } from 'ethers'

export class TravelScriptEVVM {
  private contract: Contract
  private fishingSpotUrl: string

  constructor(evvmAddress: string, fishingSpotUrl: string) {
    this.fishingSpotUrl = fishingSpotUrl
    // Simplified contract interface
    this.contract = new Contract(
      evvmAddress,
      ['function createPrescription(string,string,string,uint256,string)'],
      null
    )
  }

  async createPrescriptionGasless(
    patientAddress: string,
    medicine: string,
    dosage: string,
    expiryDate: number,
    doctorSignature: string
  ): Promise<string> {
    const payload = {
      functionName: 'createPrescription',
      params: [patientAddress, medicine, dosage, expiryDate, doctorSignature],
      signature: 'gasless-signature',
      nonce: Date.now(),
      priorityFee: 0
    }

    const response = await fetch(this.fishingSpotUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) throw new Error('Failed to submit prescription')
    
    const result = await response.json()
    return result.prescriptionId
  }
}
```

## 5. Main App Component

```typescript
// app/page.tsx
'use client'

import { useState } from 'react'
import { useAccount, useSigner } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TravelScriptSemaphore } from '@/lib/semaphore'
import { TravelScriptFlare } from '@/lib/flare'
import { TravelScriptEVVM } from '@/lib/evvm'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { data: signer } = useSigner()
  const [isLoading, setIsLoading] = useState(false)
  const [prescriptionId, setPrescriptionId] = useState<string>('')

  const [formData, setFormData] = useState({
    patientAddress: '',
    medicine: '',
    dosage: '',
    expiryDate: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signer || !address) return

    setIsLoading(true)

    try {
      // 1. Create doctor identity and sign with Semaphore
      const semaphore = new TravelScriptSemaphore('travelscript-doctors')
      const doctorIdentity = await semaphore.createDoctorIdentity()
      
      const prescriptionHash = `hash-${Date.now()}`
      const semaphoreProof = await semaphore.signPrescription(prescriptionHash)

      // 2. Store signature on Flare FDC
      const flare = new TravelScriptFlare(
        signer,
        process.env.NEXT_PUBLIC_FLARE_FDC_ADDRESS!
      )
      await flare.storeDoctorSignature(prescriptionHash, semaphoreProof)

      // 3. Create prescription gasless on EVVM
      const evvm = new TravelScriptEVVM(
        process.env.NEXT_PUBLIC_EVVM_ADDRESS!,
        process.env.NEXT_PUBLIC_FISHING_SPOT_URL!
      )
      
      const createdId = await evvm.createPrescriptionGasless(
        formData.patientAddress,
        formData.medicine,
        formData.dosage,
        new Date(formData.expiryDate).getTime(),
        semaphoreProof
      )

      setPrescriptionId(createdId)
    } catch (error) {
      console.error('Error creating prescription:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">TravelScript</h1>
          <p className="text-gray-600">Cross-Border Medical Prescriptions</p>
        </header>

        {!isConnected ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600 mb-4">Connect your wallet to get started</p>
            <w3m-button />
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Prescription</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="patient">Patient Address</Label>
                    <Input
                      id="patient"
                      value={formData.patientAddress}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        patientAddress: e.target.value 
                      }))}
                      placeholder="0x..."
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="medicine">Medicine</Label>
                    <Input
                      id="medicine"
                      value={formData.medicine}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        medicine: e.target.value 
                      }))}
                      placeholder="e.g., Amoxicillin"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="dosage">Dosage</Label>
                    <Input
                      id="dosage"
                      value={formData.dosage}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        dosage: e.target.value 
                      }))}
                      placeholder="e.g., 500mg twice daily"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        expiryDate: e.target.value 
                      }))}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Creating...' : 'Create Prescription'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prescription Status</CardTitle>
              </CardHeader>
              <CardContent>
                {prescriptionId ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Prescription ID</p>
                      <p className="font-mono text-xs bg-gray-100 p-2 rounded">
                        {prescriptionId}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Semaphore Signature</span>
                        <span className="text-green-600 text-xs">✓ Stored on Flare</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Prescription Metadata</span>
                        <span className="text-green-600 text-xs">✓ Stored on EVVM</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Gasless Transaction</span>
                        <span className="text-green-600 text-xs">✓ Processed</span>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      Share with Patient
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No prescription created yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
```

## 6. Simple Smart Contract

```solidity
// contracts/TravelScript.sol
pragma solidity ^0.8.19;

contract TravelScript {
    struct Prescription {
        address patient;
        string medicine;
        string dosage;
        uint256 expiryDate;
        string doctorSignature;
        uint256 timestamp;
        bool active;
    }
    
    mapping(bytes32 => Prescription) public prescriptions;
    mapping(address => bytes32[]) public patientPrescriptions;
    
    event PrescriptionCreated(
        bytes32 indexed id,
        address indexed patient,
        string medicine,
        uint256 timestamp
    );
    
    function createPrescription(
        address patient,
        string memory medicine,
        string memory dosage,
        uint256 expiryDate,
        string memory doctorSignature
    ) external returns (bytes32 prescriptionId) {
        require(expiryDate > block.timestamp, "Invalid expiry date");
        
        prescriptionId = keccak256(abi.encodePacked(
            patient,
            medicine,
            block.timestamp,
            doctorSignature
        ));
        
        prescriptions[prescriptionId] = Prescription({
            patient: patient,
            medicine: medicine,
            dosage: dosage,
            expiryDate: expiryDate,
            doctorSignature: doctorSignature,
            timestamp: block.timestamp,
            active: true
        });
        
        patientPrescriptions[patient].push(prescriptionId);
        
        emit PrescriptionCreated(prescriptionId, patient, medicine, block.timestamp);
    }
    
    function verifyPrescription(bytes32 prescriptionId) external view returns (bool) {
        Prescription memory p = prescriptions[prescriptionId];
        return p.active && p.expiryDate > block.timestamp;
    }
}
```

## 7. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_FLARE_FDC_ADDRESS=0x...
NEXT_PUBLIC_EVVM_ADDRESS=0x...
NEXT_PUBLIC_FISHING_SPOT_URL=https://your-fishing-spot.com/submit
```

## 8. Package.json

```json
{
  "dependencies": {
    "@semaphore-protocol/identity": "^4.0.0",
    "@semaphore-protocol/proof": "^4.0.0",
    "@semaphore-protocol/group": "^4.0.0",
    "ethers": "^6.0.0",
    "wagmi": "^2.0.0",
    "@rainbow-me/rainbowkit": "^2.0.0",
    "next": "14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@tanstack/react-query": "^5.0.0",
    "tailwindcss": "^3.0.0"
  }
}
```

## Quick Deployment Steps

1. **Deploy to Flare**:
   ```bash
   forge script script/Deploy.s.sol --rpc-url flare --broadcast
   ```

2. **Deploy EVVM Instance**:
   ```bash
   npm run wizard
   # Select Flare network
   # Configure gasless settings
   ```

3. **Setup Semaphore**:
   ```bash
   # Create doctor group
   # Add doctor identities
   ```

4. **Start App**:
   ```bash
   npm run dev
   ```

## Prize Strategy Focus

- **Flare FDC**: Stores Semaphore signatures for doctor verification
- **EVVM Gasless**: Prescription metadata storage without gas fees
- **Semaphore**: Privacy-preserving doctor identity
- **Mobile Responsive**: Works on all devices for travelers

This streamlined implementation focuses on the core requirements while maximizing prize eligibility in your 6-hour timeframe.