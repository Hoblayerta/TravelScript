# Flare Data Connector (FDC) - Guía de Integración Real

## 🎯 ¿Qué es FDC?

Flare Data Connector (FDC) es un protocolo que permite **verificar datos externos** (Web2 y otras blockchains) en Flare de forma descentralizada. NO es un simple paquete npm, es un sistema completo de attestation.

## 📦 Paquetes Reales

```bash
# Para desarrollo con contratos
npm install @flarenetwork/flare-periphery-contracts
npm install @flarenetwork/flare-periphery-contract-artifacts

# Para interactuar con los contratos
npm install ethers axios
```

## 🏗️ Arquitectura FDC

```
┌─────────────────────────────────────────────────────┐
│               Tu Aplicación (TravelScript)          │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ 1. Request Attestation
                   ▼
┌─────────────────────────────────────────────────────┐
│        FDC Verifier Service (Testnet)               │
│   https://fdc-verifiers-testnet.flare.network/      │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ 2. Verify External Data
                   ▼
┌─────────────────────────────────────────────────────┐
│     External Data Source                            │
│  • Web2 API (prescription data)                     │
│  • Sepolia TX (prescription creation tx)            │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ 3. Create Proof
                   ▼
┌─────────────────────────────────────────────────────┐
│        Data Availability Layer (DAL)                │
│   https://fdc-dal-testnet.flare.network/            │
│   • Stores proofs after round finalization          │
│   • 90-180 seconds wait time                        │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ 4. Retrieve Proof
                   ▼
┌─────────────────────────────────────────────────────┐
│        FDCHub Contract (Coston2)                    │
│   0x1c78A073E3BD2aCa4cc327d55FB0cD4f0549B55b        │
│   • Verify proof on-chain                           │
└─────────────────────────────────────────────────────┘
```

## 🔧 Tipos de Attestation Disponibles

### 1. EVMTransaction (Recomendado para Hackathon)

Verifica que una transacción ocurrió en otra blockchain EVM.

**Caso de uso**: Verificar que se creó una prescripción en Sepolia.

```typescript
async requestTransactionAttestation(
  txHash: string,
  sourceChain: string = 'testETH' // Sepolia
): Promise<string> {
  const attestationType = ethers.zeroPadValue(
    ethers.toUtf8Bytes('EVMTransaction'),
    32
  )

  const sourceId = ethers.zeroPadValue(
    ethers.toUtf8Bytes(sourceChain),
    32
  )

  // Encode: txHash, numConfirmations, requiredEventHash
  const abiEncodedRequest = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'uint8', 'bytes32'],
    [txHash, 6, ethers.ZeroHash]
  )

  const response = await axios.post(
    'https://fdc-verifiers-testnet.flare.network/',
    {
      attestationType: attestationType,
      sourceId: sourceId,
      requestBody: {
        abi_encoded_request: abiEncodedRequest
      }
    }
  )

  return response.data.response
}
```

### 2. Web2Json (Más Complejo)

Verifica datos de APIs Web2.

**Caso de uso**: Verificar datos de prescripción desde tu API.

```typescript
async attestPrescriptionData(prescriptionId: string): Promise<string> {
  const attestationType = ethers.zeroPadValue(
    ethers.toUtf8Bytes('Web2Json'),
    32
  )

  const sourceId = ethers.zeroPadValue(
    ethers.toUtf8Bytes('travelscript'),
    32
  )

  const prescriptionUrl = `https://api.travelscript.app/prescriptions/${prescriptionId}`

  // Encode: url, pathSelectors
  const abiEncodedRequest = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'string[]'],
    [prescriptionUrl, ['data', 'prescription', 'doctorCommitment']]
  )

  const response = await axios.post(
    'https://fdc-verifiers-testnet.flare.network/',
    {
      attestationType: attestationType,
      sourceId: sourceId,
      requestBody: {
        abi_encoded_request: abiEncodedRequest
      }
    }
  )

  return response.data.response
}
```

## 🎬 Flujo Completo Paso a Paso

### Paso 1: Crear transacción que quieres atestar

```typescript
// Doctor crea prescripción en Sepolia
const tx = await doctorRegistry.signPrescription(
  nullifierHash,
  proof,
  prescriptionId
)
await tx.wait()

const txHash = tx.hash
```

### Paso 2: Request attestation al verifier

```typescript
const fdcClient = new FlareFDCClient(provider)

// Option A: Attest la transacción de Sepolia
const attestationResponse = await fdcClient.requestTransactionAttestation(
  txHash,
  'testETH'
)

// Option B: Attest los datos de la API
const attestationResponse = await fdcClient.attestPrescriptionData({
  id: prescriptionId,
  doctorCommitment: proof.commitment,
  medication: 'Amoxicillin',
  // ...
})
```

### Paso 3: Esperar finalización del round (90-180 segundos)

```typescript
// El verifier service te da un roundId
const { roundId } = attestationResponse

// Esperar y obtener proof del DAL
const proof = await fdcClient.getProofFromDAL(roundId)
```

### Paso 4: Verificar on-chain (Coston2)

```typescript
const isValid = await fdcClient.verifyAttestationOnChain(
  proof,
  attestationData
)

if (isValid) {
  // Store attestation hash en tu contrato
  await fdcClient.storeAttestationOnChain(
    proof.merkleRoot,
    prescriptionId,
    flareRegistryAddress,
    signer
  )
}
```

## 📋 Contratos FDC en Coston2 Testnet

```typescript
// FDCHub - Contract principal
const FDC_HUB = '0x1c78A073E3BD2aCa4cc327d55FB0cD4f0549B55b'

// Para obtener otros contratos, usa ContractRegistry
import { ContractRegistry } from '@flarenetwork/flare-periphery-contracts'

const registry = new ethers.Contract(
  REGISTRY_ADDRESS,
  ContractRegistry.abi,
  provider
)

const fdcHubAddress = await registry.getContractAddressByName('FdcHub')
```

## 🔗 URLs de Servicios

```typescript
// Testnet Coston2
const VERIFIER_URL = 'https://fdc-verifiers-testnet.flare.network/'
const DAL_URL = 'https://fdc-dal-testnet.flare.network/proof/{roundId}'

// Coston2 RPC
const COSTON2_RPC = 'https://coston2-api.flare.network/ext/C/rpc'
```

## 💡 Estrategia Recomendada para Hackathon

Para maximizar tus chances de ganar, usa **AMBOS** métodos:

### Método 1: EVMTransaction (Simple, robusto)

1. Doctor firma prescripción → TX en Sepolia
2. Attest esa TX en Flare via FDC
3. Pharmacy verifica que la TX fue confirmada

**Ventaja**: Fácil de implementar, muy confiable

### Método 2: Web2Json (Avanzado, más puntos)

1. Doctor firma prescripción → guarda en API
2. Attest los datos JSON de la API via FDC
3. Pharmacy verifica los datos atestados

**Ventaja**: Demuestra uso de external data source (Flare Bonus Track)

## 🎯 Implementación Práctica

```typescript
// src/lib/flare/fdc-prescription.ts
import { FlareFDCClient } from './fdc-client'
import { ethers } from 'ethers'

export class PrescriptionAttestor {
  private fdcClient: FlareFDCClient

  constructor(provider: ethers.Provider) {
    this.fdcClient = new FlareFDCClient(provider)
  }

  async attestPrescriptionCreation(
    prescriptionId: string,
    sepoliaTxHash: string,
    prescriptionData: any
  ) {
    // 1. Attest Sepolia transaction
    console.log('Attesting Sepolia transaction...')
    const txAttestation = await this.fdcClient.requestTransactionAttestation(
      sepoliaTxHash,
      'testETH'
    )

    // 2. Wait for round finalization
    console.log('Waiting for round finalization...')
    const txProof = await this.fdcClient.getProofFromDAL(
      txAttestation.roundId
    )

    // 3. Verify on Coston2
    console.log('Verifying on Coston2...')
    const txValid = await this.fdcClient.verifyAttestationOnChain(
      txProof,
      txAttestation.data
    )

    if (!txValid) {
      throw new Error('Transaction attestation invalid')
    }

    // 4. BONUS: Also attest the prescription data from API
    console.log('Attesting prescription data...')
    const dataAttestation = await this.fdcClient.attestPrescriptionData(
      prescriptionData
    )

    const dataProof = await this.fdcClient.getProofFromDAL(
      dataAttestation.roundId
    )

    return {
      transactionAttestation: {
        proof: txProof,
        valid: txValid
      },
      dataAttestation: {
        proof: dataProof,
        data: dataAttestation.data
      }
    }
  }

  async verifyPrescription(attestationHash: string): Promise<boolean> {
    // Pharmacy verification flow
    return await this.fdcClient.verifyAttestationOnChain(
      /* proof */,
      attestationHash
    )
  }
}
```

## ⚠️ Consideraciones Importantes

### Timing
- **Round finalization**: 90-180 segundos
- **Polling DAL**: Máximo 20 intentos con 10s entre c/u
- **UX**: Mostrar loading state al usuario

### Errors Comunes
1. **"Proof not available"**: Round aún no finalizó, seguir polling
2. **"Invalid attestation"**: Datos mal codificados, revisar ABI encoding
3. **"Verifier unavailable"**: Servicio caído, reintentar

### Testing
```typescript
// Test en Coston2 primero
const provider = new ethers.JsonRpcProvider(
  'https://coston2-api.flare.network/ext/C/rpc'
)

// Crear TX de prueba en Sepolia
// Atestar en Coston2
// Verificar
```

## 🏆 Criterios de Evaluación Flare

Para ganar el prize, asegúrate de:

1. ✅ **Usar FDC correctamente** (no fake attestations)
2. ✅ **Atestar datos reales** (TX o API)
3. ✅ **Verificar on-chain** (usar FDCHub)
4. ✅ **Documentar external data source** (link a API)
5. ✅ **Feedback en README** (experiencia con FDC)

## 📚 Recursos

- [FDC Official Docs](https://dev.flare.network/fdc/overview)
- [Getting Started](https://dev.flare.network/fdc/getting-started)
- [Attestation Types](https://dev.flare.network/fdc/attestation-types)
- [Coston2 Explorer](https://coston2-explorer.flare.network/)

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install @flarenetwork/flare-periphery-contracts ethers axios

# 2. Setup provider
const provider = new ethers.JsonRpcProvider(COSTON2_RPC)

# 3. Create FDC client
const fdcClient = new FlareFDCClient(provider)

# 4. Request attestation
const result = await fdcClient.requestTransactionAttestation(txHash)

# 5. Get proof
const proof = await fdcClient.getProofFromDAL(result.roundId)

# 6. Verify
const valid = await fdcClient.verifyAttestationOnChain(proof, result.data)
```

---

**Resumen**: FDC NO es un paquete npm simple. Es un sistema completo que requiere:
1. Request a verifier service
2. Wait for round finalization
3. Retrieve proof from DAL
4. Verify on-chain via FDCHub

¡Esto te da MUCHO más valor que un simple API call! 🎉
