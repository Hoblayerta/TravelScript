import { ethers } from 'ethers'
import { Identity } from '@semaphore-protocol/identity'
import { Group } from '@semaphore-protocol/group'
import { generateProof } from '@semaphore-protocol/proof'
import axios from 'axios'

interface PrescriptionData {
  prescriptionId: string
  medication: string
  dosage: string
  duration: string
  patientAddress: string
}

export class PrescriptionFlow {
  private provider: ethers.Provider
  private hubAddress: string
  private evvmAddress: string
  private fdcVerifierUrl = 'https://fdc-verifiers-testnet.flare.network/'

  constructor(
    hubAddress: string,
    evvmAddress: string,
    provider: ethers.Provider
  ) {
    this.hubAddress = hubAddress
    this.evvmAddress = evvmAddress
    this.provider = provider
  }

  /**
   * PASO 1: Doctor 1 crea receta (ej. médico de Argentina)
   */
  async createPrescription(
    doctor1Identity: Identity,
    doctorGroup: Group,
    prescriptionData: PrescriptionData,
    executorSigner: ethers.Signer
  ) {
    console.log('🏥 Doctor 1 creating prescription...')

    // 1. Encode prescription data
    const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'string', 'string'],
      [
        prescriptionData.medication,
        prescriptionData.dosage,
        prescriptionData.duration
      ]
    )

    const prescriptionHash = ethers.keccak256(encodedData)

    // 2. Generate Semaphore ZK proof for Doctor 1
    console.log('🔐 Generating Doctor 1 ZK proof...')
    const proof = await generateProof(
      doctor1Identity,
      doctorGroup,
      prescriptionHash,
      prescriptionData.prescriptionId
    )

    // 3. Call contract via EVVM (gasless)
    const hubInterface = new ethers.Interface([
      'function createPrescription(string prescriptionId, bytes prescriptionData, uint256[8] doctor1Proof, bytes32 doctor1Nullifier, address patientAddress) external'
    ])

    const callData = hubInterface.encodeFunctionData('createPrescription', [
      prescriptionData.prescriptionId,
      encodedData,
      proof.proof,
      proof.nullifier,
      prescriptionData.patientAddress
    ])

    const tx = await this.executeViaEVVM(callData, executorSigner)

    console.log('✅ Prescription created by Doctor 1')
    console.log('TX:', tx.hash)

    return {
      txHash: tx.hash,
      prescriptionHash,
      doctor1Nullifier: proof.nullifier
    }
  }

  /**
   * PASO 2: Doctor 2 valida receta (ej. médico local en país destino)
   */
  async validatePrescription(
    doctor2Identity: Identity,
    doctorGroup: Group,
    prescriptionId: string,
    executorSigner: ethers.Signer
  ) {
    console.log('👨‍⚕️ Doctor 2 validating prescription...')

    // 1. Get prescription hash from contract
    const hub = new ethers.Contract(
      this.hubAddress,
      ['function prescriptions(string) view returns (bytes32, bytes32, bytes32, address, uint256, bool, bool, bytes32)'],
      this.provider
    )

    const rx = await hub.prescriptions(prescriptionId)
    const prescriptionHash = rx[0]

    // 2. Generate Semaphore ZK proof for Doctor 2
    console.log('🔐 Generating Doctor 2 ZK proof...')
    const proof = await generateProof(
      doctor2Identity,
      doctorGroup,
      prescriptionHash, // Same hash as Doctor 1
      prescriptionId + '-validate' // Different external nullifier
    )

    // 3. Call contract via EVVM
    const hubInterface = new ethers.Interface([
      'function validatePrescription(string prescriptionId, uint256[8] doctor2Proof, bytes32 doctor2Nullifier) external'
    ])

    const callData = hubInterface.encodeFunctionData('validatePrescription', [
      prescriptionId,
      proof.proof,
      proof.nullifier
    ])

    const tx = await this.executeViaEVVM(callData, executorSigner)

    console.log('✅ Prescription validated by Doctor 2')
    console.log('TX:', tx.hash)

    return {
      txHash: tx.hash,
      doctor2Nullifier: proof.nullifier
    }
  }

  /**
   * PASO 3: FDC atesta la transacción de validación
   */
  async attestWithFDC(txHash: string, prescriptionId: string, signer: ethers.Signer) {
    console.log('🔥 Requesting FDC attestation...')

    // 1. Request attestation from FDC
    const attestationType = ethers.zeroPadValue(
      ethers.toUtf8Bytes('EVMTransaction'),
      32
    )

    const sourceId = ethers.zeroPadValue(
      ethers.toUtf8Bytes('flare'),
      32
    )

    const abiEncodedRequest = ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint8', 'bytes32'],
      [txHash, 6, ethers.ZeroHash]
    )

    const response = await axios.post(this.fdcVerifierUrl, {
      attestationType,
      sourceId,
      requestBody: {
        abi_encoded_request: abiEncodedRequest
      }
    })

    console.log('⏳ Waiting for FDC round finalization (90-180s)...')
    const { roundId } = response.data

    // 2. Wait for proof from DAL
    const proof = await this.waitForFDCProof(roundId)

    console.log('✅ FDC attestation received')

    // 3. Store attestation hash on contract
    const hub = new ethers.Contract(
      this.hubAddress,
      ['function attestPrescription(string prescriptionId, bytes32 fdcAttestationHash) external'],
      signer
    )

    const attestTx = await hub.attestPrescription(prescriptionId, proof.merkleRoot)
    await attestTx.wait()

    console.log('✅ FDC attestation stored on-chain')

    return proof.merkleRoot
  }

  /**
   * FLUJO COMPLETO
   */
  async fullFlow(
    doctor1Identity: Identity,
    doctor2Identity: Identity,
    doctorGroup: Group,
    prescriptionData: PrescriptionData,
    executorSigner: ethers.Signer
  ) {
    console.log('🚀 STARTING DUAL-DOCTOR PRESCRIPTION FLOW')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Paso 1: Doctor 1 crea (ej. Argentina)
    const { txHash: tx1 } = await this.createPrescription(
      doctor1Identity,
      doctorGroup,
      prescriptionData,
      executorSigner
    )

    console.log('⏳ Waiting 30s for TX confirmation...')
    await new Promise(r => setTimeout(r, 30000))

    // Paso 2: Doctor 2 valida (ej. USA local doctor)
    const { txHash: tx2 } = await this.validatePrescription(
      doctor2Identity,
      doctorGroup,
      prescriptionData.prescriptionId,
      executorSigner
    )

    console.log('⏳ Waiting 30s for validation TX...')
    await new Promise(r => setTimeout(r, 30000))

    // Paso 3: FDC atesta la validación
    const fdcHash = await this.attestWithFDC(
      tx2,
      prescriptionData.prescriptionId,
      executorSigner
    )

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ PRESCRIPTION FLOW COMPLETE!')
    console.log('Prescription ID:', prescriptionData.prescriptionId)
    console.log('Doctor 1 TX:', tx1)
    console.log('Doctor 2 TX:', tx2)
    console.log('FDC Attestation:', fdcHash)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return {
      prescriptionId: prescriptionData.prescriptionId,
      createTx: tx1,
      validateTx: tx2,
      fdcAttestation: fdcHash
    }
  }

  /**
   * Farmacia verifica receta
   */
  async pharmacyVerify(prescriptionId: string) {
    console.log('💊 Pharmacy verifying prescription...')

    const hub = new ethers.Contract(
      this.hubAddress,
      ['function canFillPrescription(string prescriptionId) view returns (bool canFill, string reason)'],
      this.provider
    )

    const [canFill, reason] = await hub.canFillPrescription(prescriptionId)

    if (canFill) {
      console.log('✅ VALID - Can fill prescription')
      console.log('Reason:', reason)
    } else {
      console.log('❌ INVALID - Cannot fill')
      console.log('Reason:', reason)
    }

    return { canFill, reason }
  }

  /**
   * Helper: Execute via EVVM meta-transaction
   */
  private async executeViaEVVM(callData: string, signer: ethers.Signer) {
    const evvm = new ethers.Contract(
      this.evvmAddress,
      [
        'function executeMetaTransaction(address from, address to, bytes calldata data, uint256 value, uint256 nonce, bytes calldata signature) external returns (bytes memory)',
        'function getNonce(address user) external view returns (uint256)'
      ],
      signer
    )

    const userAddress = await signer.getAddress()
    const nonce = await evvm.getNonce(userAddress)

    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'address', 'bytes', 'uint256', 'uint256'],
      [userAddress, this.hubAddress, callData, 0, nonce]
    )

    const signature = await signer.signMessage(ethers.getBytes(messageHash))

    const tx = await evvm.executeMetaTransaction(
      userAddress,
      this.hubAddress,
      callData,
      0,
      nonce,
      signature
    )

    return await tx.wait()
  }

  /**
   * Helper: Wait for FDC proof
   */
  private async waitForFDCProof(roundId: number): Promise<any> {
    const dalUrl = `https://fdc-dal-testnet.flare.network/proof/${roundId}`
    let attempts = 0

    while (attempts < 20) {
      try {
        const response = await axios.get(dalUrl)
        if (response.data.proof) return response.data.proof
      } catch {}

      await new Promise(r => setTimeout(r, 10000))
      attempts++
    }

    throw new Error('FDC proof timeout')
  }
}
