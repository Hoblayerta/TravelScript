/**
 * EVVM PrescriptionHub Contract Integration
 * Interacts with PrescriptionHub.sol deployed on Flare Coston2
 */

import { ethers, BrowserProvider } from 'ethers';
import type { Prescription } from '@/types/prescription';
import { requestPrescriptionAttestation } from '../fdc/attestation-service';

// Flare Coston2 Configuration
export const FLARE_COSTON2_CONFIG = {
  chainId: 114,
  name: 'Flare Testnet Coston2',
  rpcUrl: 'https://coston2-api.flare.network/ext/C/rpc',
  explorerUrl: 'https://coston2-explorer.flare.network',
};

// Contract addresses (update after deployment)
export const CONTRACT_ADDRESSES = {
  prescriptionHub: process.env.NEXT_PUBLIC_PRESCRIPTION_HUB_ADDRESS || '',
  evvm: '0x37628b685c84a67cDd350D626a572857DFCcEC74',
  semaphore: process.env.NEXT_PUBLIC_SEMAPHORE_ADDRESS || '',
};

// PrescriptionHub ABI
const PRESCRIPTION_HUB_ABI = [
  'function createPrescription(string calldata prescriptionId, bytes calldata prescriptionData, uint256[8] calldata doctor1Proof, bytes32 doctor1Nullifier, address patientAddress) external',
  'function validatePrescription(string calldata prescriptionId, uint256[8] calldata doctor2Proof, bytes32 doctor2Nullifier) external',
  'function attestPrescription(string calldata prescriptionId, bytes32 fdcAttestationHash) external',
  'function canFillPrescription(string calldata prescriptionId) external view returns (bool canFill, string memory reason)',
  'function prescriptions(string calldata prescriptionId) external view returns (bytes32 prescriptionHash, bytes32 doctor1Nullifier, bytes32 doctor2Nullifier, address patientAddress, uint256 timestamp, bool validated, bool active, bytes32 fdcAttestationHash)',
  'event PrescriptionCreated(string indexed prescriptionId, bytes32 prescriptionHash, bytes32 doctor1Nullifier, address indexed patient)',
  'event PrescriptionValidated(string indexed prescriptionId, bytes32 doctor2Nullifier)',
  'event PrescriptionAttested(string indexed prescriptionId, bytes32 fdcAttestationHash)',
];

/**
 * Get PrescriptionHub contract instance
 */
export async function getPrescriptionHubContract(
  provider: BrowserProvider,
  withSigner: boolean = false
) {
  const contract = new ethers.Contract(
    CONTRACT_ADDRESSES.prescriptionHub,
    PRESCRIPTION_HUB_ABI,
    provider
  );

  if (withSigner) {
    const signer = await provider.getSigner(); // Corrección: await para obtener el signer
    return contract.connect(signer) as ethers.Contract;
  }

  return contract;
}

/**
 * Create prescription on-chain (Doctor 1 / Issuer)
 */
export async function createPrescriptionOnChain(
  prescription: Prescription,
  semaphoreProof: any,
  doctorNullifier: string,
  provider: BrowserProvider
): Promise<string> {
  try {
    const contract = await getPrescriptionHubContract(provider, true); // Corrección: await

    // Encode prescription data
    const prescriptionData = ethers.AbiCoder.defaultAbiCoder().encode(
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

    // Convert Semaphore proof to uint256[8] format
    const proofArray = semaphoreProof.proof; // Assuming this is already in correct format

    // Call contract
    const tx = await contract.createPrescription(
      prescription.data.id,
      prescriptionData,
      proofArray,
      ethers.hexlify(doctorNullifier),
      prescription.issuerSignature.walletAddress
    );

    console.log('Creating prescription on-chain, tx:', tx.hash);
    const receipt = await tx.wait();

    console.log('Prescription created successfully!', receipt.hash);
    return receipt.hash;
  } catch (error) {
    console.error('Error creating prescription on-chain:', error);
    throw error;
  }
}

/**
 * Validate prescription on-chain (Doctor 2 / Validator)
 */
export async function validatePrescriptionOnChain(
  prescriptionId: string,
  semaphoreProof: any,
  validatorNullifier: string,
  provider: BrowserProvider
): Promise<string> {
  try {
    const contract = await getPrescriptionHubContract(provider, true); // Corrección: await

    const proofArray = semaphoreProof.proof;

    const tx = await contract.validatePrescription(
      prescriptionId,
      proofArray,
      ethers.hexlify(validatorNullifier)
    );

    console.log('Validating prescription on-chain, tx:', tx.hash);
    const receipt = await tx.wait();

    console.log('Prescription validated successfully!', receipt.hash);
    return receipt.hash;
  } catch (error) {
    console.error('Error validating prescription on-chain:', error);
    throw error;
  }
}

/**
 * Attest prescription with FDC hash (After both signatures)
 */
export async function attestPrescriptionOnChain(
  prescriptionId: string,
  fdcAttestationHash: string,
  provider: BrowserProvider
): Promise<string> {
  try {
    const contract = await getPrescriptionHubContract(provider, true); // Corrección: await

    const tx = await contract.attestPrescription(prescriptionId, fdcAttestationHash);

    console.log('Attesting prescription with FDC, tx:', tx.hash);
    const receipt = await tx.wait();

    console.log('Prescription attested successfully!', receipt.hash);
    return receipt.hash;
  } catch (error) {
    console.error('Error attesting prescription on-chain:', error);
    throw error;
  }
}

/**
 * Check if prescription can be filled (Pharmacy validation)
 */
export async function canFillPrescription(
  prescriptionId: string,
  provider: BrowserProvider
): Promise<{ canFill: boolean; reason: string }> {
  try {
    const contract = await getPrescriptionHubContract(provider, false); // Corrección: await

    const [canFill, reason] = await contract.canFillPrescription(prescriptionId);

    return { canFill, reason };
  } catch (error) {
    console.error('Error checking prescription status:', error);
    throw error;
  }
}

/**
 * Get prescription details from blockchain
 */
export async function getPrescriptionFromChain(
  prescriptionId: string,
  provider: BrowserProvider
): Promise<any> {
  try {
    const contract = await getPrescriptionHubContract(provider, false); // Corrección: await

    const prescription = await contract.prescriptions(prescriptionId);

    return {
      prescriptionHash: prescription[0],
      doctor1Nullifier: prescription[1],
      doctor2Nullifier: prescription[2],
      patientAddress: prescription[3],
      timestamp: prescription[4],
      validated: prescription[5],
      active: prescription[6],
      fdcAttestationHash: prescription[7],
    };
  } catch (error) {
    console.error('Error getting prescription from chain:', error);
    throw error;
  }
}

/**
 * Complete flow: Create → Validate → Attest with FDC
 */
export async function completePrescriptionFlow(
  prescription: Prescription,
  issuerProof: any,
  issuerNullifier: string,
  validatorProof: any,
  validatorNullifier: string,
  provider: BrowserProvider
): Promise<{
  createTxHash: string;
  validateTxHash: string;
  attestTxHash: string;
  fdcAttestationHash: string;
}> {
  // Step 1: Create prescription (Doctor 1)
  const createTxHash = await createPrescriptionOnChain(
    prescription,
    issuerProof,
    issuerNullifier,
    provider
  );

  // Step 2: Validate prescription (Doctor 2)
  const validateTxHash = await validatePrescriptionOnChain(
    prescription.data.id,
    validatorProof,
    validatorNullifier,
    provider
  );

  // Step 3: Request FDC attestation
  const { attestationHash } = await requestPrescriptionAttestation(prescription);

  // Step 4: Store FDC attestation hash on-chain
  const attestTxHash = await attestPrescriptionOnChain(
    prescription.data.id,
    attestationHash,
    provider
  );

  return {
    createTxHash,
    validateTxHash,
    attestTxHash,
    fdcAttestationHash: attestationHash,
  };
}

/**
 * Listen to prescription events
 */
export function subscribeToPrescriptionEvents(
  provider: BrowserProvider,
  callback: (event: any) => void
) {
  getPrescriptionHubContract(provider, false).then(contract => {
    contract.on('PrescriptionCreated', (prescriptionId, hash, nullifier, patient, event) => {
      callback({
        type: 'created',
        prescriptionId,
        hash,
        nullifier,
        patient,
        event,
      });
    });

    contract.on('PrescriptionValidated', (prescriptionId, nullifier, event) => {
      callback({
        type: 'validated',
        prescriptionId,
        nullifier,
        event,
      });
    });

    contract.on('PrescriptionAttested', (prescriptionId, fdcHash, event) => {
      callback({
        type: 'attested',
        prescriptionId,
        fdcHash,
        event,
      });
    });
  });

  return () => {
    getPrescriptionHubContract(provider, false).then(contract => {
      contract.removeAllListeners();
    });
  };
}
