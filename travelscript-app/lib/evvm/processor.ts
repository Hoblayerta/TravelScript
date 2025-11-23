/**
 * Real EVVM Processor Implementation
 * Handles EVVM contract interactions and gasless transactions
 */

import { ethers, BrowserProvider } from 'ethers';
import type { Prescription } from '@/types/prescription';
import { fdcClient } from '../fdc/client';

// EVVM Configuration
export const EVVM_CONFIG = {
  evvmAddress: '0x37628b685c84a67cDd350D626a572857DFCcEC74',
  stakingAddress: '0x039F84BaF64F7cE5C274cDd11A800ACC7347A809',
  estimatorAddress: '0x2F17029adff2b11C234f8Eab641A77E4629B1a40',
  chainId: 114, // Flare Coston2
  rpcUrl: 'https://coston2-api.flare.network/ext/C/rpc',
};

// Contract addresses (to be updated after deployment)
export const CONTRACT_ADDRESSES = {
  prescriptionHub: process.env.NEXT_PUBLIC_PRESCRIPTION_HUB_ADDRESS || '',
  evvm: EVVM_CONFIG.evvmAddress,
  semaphore: process.env.NEXT_PUBLIC_SEMAPHORE_ADDRESS || '',
};

// PrescriptionHub ABI
const PRESCRIPTION_HUB_ABI = [
  'function createPrescription(string calldata prescriptionId, bytes calldata prescriptionData, uint256[8] calldata doctor1Proof, bytes32 doctor1Nullifier, address patientAddress) external',
  'function validatePrescription(string calldata prescriptionId, uint256[8] calldata doctor2Proof, bytes32 doctor2Nullifier) external',
  'function attestPrescription(string calldata prescriptionId, bytes32 fdcAttestationHash) external',
  'function canFillPrescription(string calldata prescriptionId) external view returns (bool canFill, string memory reason)',
  'function prescriptions(string calldata prescriptionId) external view returns (bytes32 prescriptionHash, bytes32 doctor1Nullifier, bytes32 doctor2Nullifier, address patientAddress, uint256 timestamp, bool validated, bool active, bytes32 fdcAttestationHash)',
  'function revokePrescription(string calldata prescriptionId) external',
  'event PrescriptionCreated(string indexed prescriptionId, bytes32 prescriptionHash, bytes32 doctor1Nullifier, address indexed patient)',
  'event PrescriptionValidated(string indexed prescriptionId, bytes32 doctor2Nullifier)',
  'event PrescriptionAttested(string indexed prescriptionId, bytes32 fdcAttestationHash)',
];

// EVVM ABI for gasless transactions
const EVVM_ABI = [
  'function executeMetaTransaction(address target, bytes calldata data, bytes calldata signature) external returns (bytes memory)',
  'function getNonce(address user) external view returns (uint256)',
];

/**
 * EVVM Processor for handling prescription operations
 */
export class EVVMProcessor {
  private provider: BrowserProvider;
  private prescriptionHubAddress: string;
  private evvmAddress: string;

  constructor(provider: BrowserProvider) {
    this.provider = provider;
    this.prescriptionHubAddress = CONTRACT_ADDRESSES.prescriptionHub;
    this.evvmAddress = CONTRACT_ADDRESSES.evvm;
  }

  /**
   * Get PrescriptionHub contract instance
   */
  private async getPrescriptionHubContract(withSigner: boolean = false) {
    const { getPrescriptionHubContract } = await import('./prescription-contract');
    // Usa el import centralizado y espera el signer correctamente
    return getPrescriptionHubContract(this.provider, withSigner);
  }

  /**
   * Get EVVM contract instance
   */
  private async getEVVMContract(withSigner: boolean = false) {
    const contract = new ethers.Contract(
      this.evvmAddress,
      EVVM_ABI,
      this.provider
    );

    if (withSigner) {
      const signer = await this.provider.getSigner();
      return contract.connect(signer);
    }

    return contract;
  }

  /**
   * Encode prescription data for on-chain storage
   */
  private encodePrescriptionData(prescription: Prescription): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'string', 'string', 'string', 'string', 'string'],
      [
        prescription.data.patientName,
        prescription.data.medication,
        prescription.data.dosage,
        prescription.data.frequency,
        prescription.data.duration,
        prescription.data.notes || '',
      ]
    );
  }

  /**
   * Create prescription on-chain (Doctor 1 / Issuer)
   */
  async createPrescription(
    prescription: Prescription,
    semaphoreProof: {
      proof: bigint[];
      nullifier: bigint;
      merkleTreeRoot: bigint;
    },
    patientAddress: string,
    onProgress?: (step: string, details?: any) => void
  ): Promise<{ txHash: string; prescriptionId: string }> {
    try {
      onProgress?.('Encoding prescription data...');

      const prescriptionData = this.encodePrescriptionData(prescription);
      const proofArray = semaphoreProof.proof.map((p) => p.toString());

      onProgress?.('Submitting to blockchain...');

      const contract = await this.getPrescriptionHubContract(true);
      // @ts-ignore
      const tx = await contract.createPrescription(
        prescription.data.id,
        prescriptionData,
        proofArray,
        ethers.toBeHex(semaphoreProof.nullifier, 32),
        patientAddress
      );

      onProgress?.('Waiting for confirmation...', { txHash: tx.hash });

      const receipt = await tx.wait();

      onProgress?.('Prescription created successfully!', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });

      return {
        txHash: receipt.hash,
        prescriptionId: prescription.data.id,
      };
    } catch (error) {
      console.error('[EVVM] Create prescription error:', error);
      throw error;
    }
  }

  /**
   * Validate prescription on-chain (Doctor 2 / Validator)
   */
  async validatePrescription(
    prescriptionId: string,
    semaphoreProof: {
      proof: bigint[];
      nullifier: bigint;
      merkleTreeRoot: bigint;
    },
    onProgress?: (step: string, details?: any) => void
  ): Promise<{ txHash: string }> {
    try {
      onProgress?.('Preparing validation...');

      const proofArray = semaphoreProof.proof.map((p) => p.toString());

      onProgress?.('Submitting validation to blockchain...');

      const contract = await this.getPrescriptionHubContract(true);
      // @ts-ignore
      const tx = await contract.validatePrescription(
        prescriptionId,
        proofArray,
        ethers.toBeHex(semaphoreProof.nullifier, 32)
      );

      onProgress?.('Waiting for confirmation...', { txHash: tx.hash });

      const receipt = await tx.wait();

      onProgress?.('Prescription validated successfully!', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });

      return {
        txHash: receipt.hash,
      };
    } catch (error) {
      console.error('[EVVM] Validate prescription error:', error);
      throw error;
    }
  }

  /**
   * Attest prescription with FDC (After validation)
   */
  async attestPrescription(
    prescription: Prescription,
    onProgress?: (step: string, details?: any) => void
  ): Promise<{ txHash: string; attestationHash: string; votingRound: string }> {
    try {
      // Step 1: Prepare prescription metadata
      onProgress?.('Preparing prescription metadata...');

      const metadata = {
        prescriptionId: prescription.data.id,
        prescriptionHash: prescription.prescriptionHash,
        issuer: prescription.issuerSignature,
        validator: prescription.validatorSignature,
        data: prescription.data,
        status: prescription.status,
        createdAt: prescription.data.createdAt,
        validatedAt: prescription.validatorSignature?.timestamp,
      };

      // Step 2: Request FDC attestation
      const { attestationHash, votingRound, verified } =
        await fdcClient.attestPrescriptionMetadata(
          prescription.data.id,
          metadata,
          this.provider,
          onProgress
        );

      if (!verified) {
        throw new Error('FDC attestation verification failed');
      }

      // Step 3: Store attestation hash on-chain
      onProgress?.('Storing FDC attestation on-chain...');

      const contract = await this.getPrescriptionHubContract(true);
      // @ts-ignore
      const tx = await contract.attestPrescription(
        prescription.data.id,
        attestationHash
      );

      onProgress?.('Waiting for confirmation...', { txHash: tx.hash });

      const receipt = await tx.wait();

      onProgress?.('FDC attestation stored successfully!', {
        txHash: receipt.hash,
        attestationHash,
        votingRound,
      });

      return {
        txHash: receipt.hash,
        attestationHash,
        votingRound,
      };
    } catch (error) {
      console.error('[EVVM] Attest prescription error:', error);
      throw error;
    }
  }

  /**
   * Check if prescription can be filled (Pharmacy verification)
   */
  async canFillPrescription(
    prescriptionId: string
  ): Promise<{ canFill: boolean; reason: string }> {
    try {
      const contract = await this.getPrescriptionHubContract(false);
      // @ts-ignore
      const [canFill, reason] = await contract.canFillPrescription(prescriptionId);
      return { canFill, reason };
    } catch (error) {
      console.error('[EVVM] Can fill prescription error:', error);
      throw error;
    }
  }

  /**
   * Get prescription details from blockchain
   */
  async getPrescriptionFromChain(prescriptionId: string): Promise<{
    prescriptionHash: string;
    doctor1Nullifier: string;
    doctor2Nullifier: string;
    patientAddress: string;
    timestamp: bigint;
    validated: boolean;
    active: boolean;
    fdcAttestationHash: string;
  }> {
    try {
      const contract = await this.getPrescriptionHubContract(false);
      // @ts-ignore
      const result = await contract.prescriptions(prescriptionId);
      return {
        prescriptionHash: result[0],
        doctor1Nullifier: result[1],
        doctor2Nullifier: result[2],
        patientAddress: result[3],
        timestamp: result[4],
        validated: result[5],
        active: result[6],
        fdcAttestationHash: result[7],
      };
    } catch (error) {
      console.error('[EVVM] Get prescription from chain error:', error);
      throw error;
    }
  }

  /**
   * Revoke prescription (Patient only)
   */
  async revokePrescription(
    prescriptionId: string,
    onProgress?: (step: string, details?: any) => void
  ): Promise<{ txHash: string }> {
    try {
      onProgress?.('Revoking prescription...');
      const contract = await this.getPrescriptionHubContract(true);
      // @ts-ignore
      const tx = await contract.revokePrescription(prescriptionId);
      onProgress?.('Waiting for confirmation...', { txHash: tx.hash });
      const receipt = await tx.wait();
      onProgress?.('Prescription revoked successfully!', { txHash: receipt.hash });
      return {
        txHash: receipt.hash,
      };
    } catch (error) {
      console.error('[EVVM] Revoke prescription error:', error);
      throw error;
    }
  }

  /**
   * Complete prescription flow: Create → Validate → Attest
   */
  async completePrescriptionFlow(
    prescription: Prescription,
    issuerProof: { proof: bigint[]; nullifier: bigint; merkleTreeRoot: bigint },
    validatorProof: { proof: bigint[]; nullifier: bigint; merkleTreeRoot: bigint },
    patientAddress: string,
    onProgress?: (step: string, details?: any) => void
  ): Promise<{
    createTxHash: string;
    validateTxHash: string;
    attestTxHash: string;
    attestationHash: string;
    votingRound: string;
  }> {
    // Step 1: Create prescription
    onProgress?.('Step 1/3: Creating prescription...');
    const { txHash: createTxHash } = await this.createPrescription(
      prescription,
      issuerProof,
      patientAddress,
      onProgress
    );

    // Step 2: Validate prescription
    onProgress?.('Step 2/3: Validating prescription...');
    const { txHash: validateTxHash } = await this.validatePrescription(
      prescription.data.id,
      validatorProof,
      onProgress
    );

    // Step 3: Attest with FDC
    onProgress?.('Step 3/3: Attesting with FDC...');
    const { txHash: attestTxHash, attestationHash, votingRound } =
      await this.attestPrescription(prescription, onProgress);

    onProgress?.('Complete flow finished!', {
      createTxHash,
      validateTxHash,
      attestTxHash,
    });

    return {
      createTxHash,
      validateTxHash,
      attestTxHash,
      attestationHash,
      votingRound,
    };
  }

  /**
   * Subscribe to prescription events
   */
  subscribeToEvents(callback: (event: any) => void): () => void {
    this.getPrescriptionHubContract(false).then(contract => {
      contract.on(
        'PrescriptionCreated',
        (prescriptionId, hash, nullifier, patient, event) => {
          callback({
            type: 'created',
            prescriptionId,
            hash,
            nullifier,
            patient,
            blockNumber: event.log.blockNumber,
            txHash: event.log.transactionHash,
          });
        }
      );

      contract.on('PrescriptionValidated', (prescriptionId, nullifier, event) => {
        callback({
          type: 'validated',
          prescriptionId,
          nullifier,
          blockNumber: event.log.blockNumber,
          txHash: event.log.transactionHash,
        });
      });

      contract.on('PrescriptionAttested', (prescriptionId, fdcHash, event) => {
        callback({
          type: 'attested',
          prescriptionId,
          fdcHash,
          blockNumber: event.log.blockNumber,
          txHash: event.log.transactionHash,
        });
      });
    });

    return () => {
      this.getPrescriptionHubContract(false).then(contract => {
        contract.removeAllListeners();
      });
    };
  }
}

/**
 * Create EVVM processor instance
 */
export function createEVVMProcessor(provider: BrowserProvider): EVVMProcessor {
  return new EVVMProcessor(provider);
}
