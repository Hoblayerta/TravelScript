# EVVM Deployment on Flare Coston2 - Complete Guide

## 🎯 Estrategia Correcta

**ANTES (Incorrecto)**: Usar MATE Metaprotocol en Sepolia
**AHORA (Correcto)**: Deployar nuestra propia EVVM en Flare Coston2

### ¿Por qué este cambio?

1. ✅ **Compatible con FDC**: EVVM en Flare puede usar Flare Data Connector directamente
2. ✅ **Califica para más prizes**: EVVM Custom Chain ($5k) + EVVM Best Integration ($7k)
3. ✅ **Gasless + FDC en la misma red**: Todo en Flare Coston2
4. ✅ **Más puntos de innovación**: Deployment propio demuestra expertise

## 📋 Información de Flare Coston2 Testnet

```typescript
// Flare Coston2 Testnet
const FLARE_COSTON2 = {
  chainId: 114,
  name: 'Flare Testnet Coston2',
  rpcUrl: 'https://coston2-api.flare.network/ext/C/rpc',
  rpcWss: 'wss://coston2-api.flare.network/ext/C/ws',
  explorer: 'https://coston2-explorer.flare.network',
  faucet: 'https://faucet.flare.network/coston2',
  nativeCurrency: {
    name: 'Coston2 Flare',
    symbol: 'C2FLR',
    decimals: 18
  }
}
```

## 🚀 Paso a Paso: Deploy EVVM

### Paso 1: Clonar e Instalar EVVM

```bash
# En tu directorio de trabajo (fuera de travelscript-app)
cd ..
git clone https://github.com/EVVM-org/Testnet-Contracts evvm-deployment
cd evvm-deployment

# Instalar dependencias
make install

# Output esperado:
# ✅ npm dependencies installed
# ✅ git submodules initialized
# ✅ contracts compiled with IR optimization
```

### Paso 2: Configurar Entorno

```bash
# Copiar template
cp .env.example .env
```

**Editar `.env`**:
```bash
# Flare Coston2 Configuration
COSTON2_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
COSTON2_EXPLORER_API_KEY=  # Opcional

# ⚠️ NUNCA pongas private keys aquí!
# Usaremos cast wallet import en el siguiente paso
```

### Paso 3: Setup de Wallet

```bash
# Importar private key de forma segura
cast wallet import travelscript-deployer --interactive

# Te pedirá:
# 1. Private key (pégala, no se mostrará)
# 2. Password para encriptar (guárdalo bien!)

# Verificar que se importó correctamente
cast wallet list
# Output: travelscript-deployer
```

### Paso 4: Obtener Tokens de Testnet

1. Ve a: https://faucet.flare.network/coston2
2. Pega tu dirección de deployer
3. Solicita **C2FLR tokens**
4. Espera confirmación (~30 segundos)

Necesitarás aproximadamente **5-10 C2FLR** para:
- Deployment de EVVM core
- Deployment del metadata contract
- Interacciones de prueba

**Verificar balance**:
```bash
cast balance YOUR_ADDRESS --rpc-url https://coston2-api.flare.network/ext/C/rpc
```

### Paso 5: Deploy con Wizard (Recomendado)

```bash
npm run wizard
```

**Flujo interactivo**:

```
┌─────────────────────────────────────┐
│   EVVM Deployment Wizard v2.0       │
└─────────────────────────────────────┘

Select network:
  1. Ethereum Sepolia
  2. Arbitrum Sepolia
❯ 3. Custom RPC

Enter RPC URL: https://coston2-api.flare.network/ext/C/rpc
Enter Chain ID: 114

Select wallet:
❯ travelscript-deployer

Network Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Chain ID: 114
  RPC URL: https://coston2-api.flare.network/ext/C/rpc
  Deployer: 0xYourAddress...
  Balance: 8.5 C2FLR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Proceed with deployment? (Y/n): Y

⏳ Deploying EVVM contracts...

✅ EVVM Core deployed: 0x1234...abcd
✅ EVVM Executor deployed: 0x5678...efgh
✅ Contracts verified on explorer

🎉 Deployment successful!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Save these addresses:

EVVM_ADDRESS=0x1234...abcd
EXECUTOR_ADDRESS=0x5678...efgh

View on Explorer:
https://coston2-explorer.flare.network/address/0x1234...abcd
```

**⚠️ IMPORTANTE**: Guarda las addresses deployadas!

### Paso 6: Deploy Metadata Contract en EVVM

Ahora deployas tu contrato de metadata **dentro de la EVVM** que acabas de crear:

**File**: `contracts/EVVMPrescriptionMetadata.sol` (en tu proyecto travelscript)

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

    event MetadataStored(string indexed prescriptionId);

    function storeMetadata(
        string calldata prescriptionId,
        bytes32 doctorCommitment,
        bytes32 patientHash,
        bytes32 medicationHash,
        bytes32 flareAttestationHash
    ) external {
        prescriptionMetadata[prescriptionId] = Metadata({
            doctorCommitment: doctorCommitment,
            patientHash: patientHash,
            medicationHash: medicationHash,
            flareAttestationHash: flareAttestationHash,
            timestamp: block.timestamp,
            active: true
        });

        emit MetadataStored(prescriptionId);
    }

    function getMetadata(string calldata prescriptionId)
        external
        view
        returns (
            bytes32 doctorCommitment,
            bytes32 patientHash,
            bytes32 medicationHash,
            bytes32 flareAttestationHash,
            uint256 timestamp,
            bool active
        )
    {
        Metadata memory meta = prescriptionMetadata[prescriptionId];
        return (
            meta.doctorCommitment,
            meta.patientHash,
            meta.medicationHash,
            meta.flareAttestationHash,
            meta.timestamp,
            meta.active
        );
    }

    function deactivateMetadata(string calldata prescriptionId) external {
        prescriptionMetadata[prescriptionId].active = false;
    }
}
```

**Deploy script**:

```bash
# En tu proyecto travelscript-app
forge create src/EVVMPrescriptionMetadata.sol:EVVMPrescriptionMetadata \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --account travelscript-deployer \
  --verify

# Guarda la address del metadata contract!
```

### Paso 7: Configurar Frontend

**File**: `src/config/chains.ts`

```typescript
import { defineChain } from 'viem'

export const flareCoston2 = defineChain({
  id: 114,
  name: 'Flare Testnet Coston2',
  network: 'coston2',
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
})
```

**File**: `.env.local`

```bash
# Flare Coston2
NEXT_PUBLIC_FLARE_RPC=https://coston2-api.flare.network/ext/C/rpc
NEXT_PUBLIC_CHAIN_ID=114

# Tu EVVM deployada
NEXT_PUBLIC_EVVM_ADDRESS=0x1234...abcd  # De wizard output
NEXT_PUBLIC_EXECUTOR_ADDRESS=0x5678...efgh

# Metadata contract
NEXT_PUBLIC_EVVM_METADATA=0x9abc...def0  # De forge create output

# FDC
NEXT_PUBLIC_FDC_HUB=0x1c78A073E3BD2aCa4cc327d55FB0cD4f0549B55b

# Semaphore (deployar en Coston2 también)
NEXT_PUBLIC_DOCTOR_REGISTRY=0x...
```

## 🔄 Flujo Completo con EVVM en Flare

```
┌─────────────────────────────────────────────────────────┐
│                   Flare Coston2 (Chain ID: 114)         │
│                                                          │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Semaphore    │  │  Flare FDC   │  │  Your EVVM  │ │
│  │ Doctor Registry│  │     Hub      │  │   Instance  │ │
│  └────────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│           │                  │                  │        │
│           │ 1. ZK Proof      │                  │        │
│           │◄─────────────────┤                  │        │
│           │                  │                  │        │
│           │             2. Attest TX            │        │
│           │─────────────────►│                  │        │
│           │                  │                  │        │
│           │                  │   3. Store Metadata       │
│           │                  │  (Gasless via EVVM)       │
│           │──────────────────┼─────────────────►│        │
│           │                  │                  │        │
└───────────┼──────────────────┼──────────────────┼────────┘
            │                  │                  │
            │    Todo en la misma red: Flare!    │
            └────────────────────────────────────┘
```

### Ventajas de esta arquitectura:

1. **Un solo testnet**: Todo en Flare Coston2
2. **FDC nativo**: Flare FDC puede verificar TXs dentro de Flare
3. **Gasless real**: EVVM meta-transactions funcionan
4. **Compatible**: Semaphore se puede deployar en Coston2
5. **Bonus prizes**: Calificas para EVVM Custom Chain

## 🎯 Calificación para Prizes

### EVVM Custom Service or Chain ($5,000)
✅ Deployaste tu propia EVVM instance
✅ Customizada para prescripciones médicas
✅ Metadata storage contract específico
✅ Gasless transactions implementadas

### EVVM Best Integration ($7,000)
✅ Async nonces para UX mejorada
✅ Executor pattern para meta-transactions
✅ Integración real con FDC de Flare
✅ Documentación completa

### EVVM Feedback ($500)
✅ Experiencia con wizard deployment
✅ Feedback sobre custom chain en Flare
✅ Documentación del proceso

**Total EVVM**: $12,500
**Total Flare**: $10,000
**Gran Total**: $22,500+ 🎉

## 🔧 Troubleshooting

### Error: "Insufficient funds"
```bash
# Verificar balance
cast balance YOUR_ADDRESS --rpc-url https://coston2-api.flare.network/ext/C/rpc

# Si es bajo, pedir más del faucet
# https://faucet.flare.network/coston2
```

### Error: "Nonce too low"
```bash
# Reset nonce en wallet
cast wallet import travelscript-deployer --interactive --force
```

### Error: "Contract verification failed"
```bash
# Verificar manualmente
forge verify-contract \
  YOUR_CONTRACT_ADDRESS \
  src/EVVMPrescriptionMetadata.sol:EVVMPrescriptionMetadata \
  --chain-id 114 \
  --watch
```

### Wizard no encuentra wallet
```bash
# Listar wallets
cast wallet list

# Si no aparece, reimportar
cast wallet import travelscript-deployer --interactive
```

## 📚 Recursos

- **EVVM Quickstart**: https://www.evvm.info/docs/QuickStart
- **Flare Coston2 Info**: https://dev.flare.network/network/overview
- **EVVM Telegram**: https://t.me/EVVMorg
- **Flare Faucet**: https://faucet.flare.network/coston2
- **Coston2 Explorer**: https://coston2-explorer.flare.network

## ✅ Checklist de Deployment

- [ ] EVVM repo clonado
- [ ] Make install ejecutado
- [ ] Wallet importado con cast
- [ ] C2FLR obtenidos del faucet (5-10 tokens)
- [ ] Wizard ejecutado exitosamente
- [ ] EVVM_ADDRESS guardada
- [ ] EXECUTOR_ADDRESS guardada
- [ ] Metadata contract deployado
- [ ] Addresses en .env.local
- [ ] Contratos verificados en explorer
- [ ] Frontend configurado con Coston2

## 🚀 Siguiente Paso

Una vez deployado EVVM en Flare Coston2:

1. Actualizar `src/lib/evvm/evvm-client.ts` con las addresses
2. Configurar Reown con chain Flare Coston2
3. Deployar Semaphore DoctorRegistry en Coston2
4. Integrar FDC con EVVM
5. Testear flujo completo

---

**TODO EN FLARE COSTON2 = ARQUITECTURA MÁS SIMPLE Y MÁS PRIZES! 🎉**
