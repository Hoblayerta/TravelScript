import { Identity } from '@semaphore-protocol/identity';
import { Group } from '@semaphore-protocol/group';
import { generateProof, verifyProof } from '@semaphore-protocol/proof';
import { BrowserProvider } from 'ethers';
import type { DoctorIdentity, Prescription } from '@/types/prescription';

// Create a new doctor identity
export function createDoctorIdentity(walletAddress: string): {
  identity: Identity;
  commitment: string;
  privateKey: string;
} {
  const identity = new Identity(walletAddress); // Deterministic from wallet
  const commitment = identity.commitment.toString();
  const privateKey = identity.export();

  return { identity, commitment, privateKey };
}

// Import doctor identity from private key
export function importDoctorIdentity(privateKey: string): Identity {
  return Identity.import(privateKey);
}

// Generate proof for prescription signature
export async function generatePrescriptionProof(
  identity: Identity,
  prescriptionHash: string,
  doctorGroup: Group
): Promise<any> {
  try {
    const message = BigInt('0x' + prescriptionHash.slice(2, 34)); // Convert hash to BigInt
    const scope = doctorGroup.root; // Use group root as scope

    const proof = await generateProof(identity, doctorGroup, message, scope);
    return proof;
  } catch (error) {
    console.error('Error generating proof:', error);
    throw error;
  }
}

// Verify prescription proof
export async function verifyPrescriptionProof(proof: any): Promise<boolean> {
  try {
    const isValid = await verifyProof(proof);
    return isValid;
  } catch (error) {
    console.error('Error verifying proof:', error);
    return false;
  }
}

// Create a group of verified doctors
export function createDoctorGroup(commitments: bigint[] = []): Group {
  return new Group(commitments);
}

// Hash prescription data
export function hashPrescription(prescription: Prescription): string {
  const data = JSON.stringify({
    ...prescription.data,
    issuer: prescription.issuerSignature.walletAddress,
  });

  // Simple hash for demo (in production use proper cryptographic hash)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
}

// Store doctor identity in localStorage
export function storeDoctorIdentity(doctor: DoctorIdentity): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('doctor_identity', JSON.stringify(doctor));
}

// Retrieve doctor identity from localStorage
export function retrieveDoctorIdentity(): DoctorIdentity | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('doctor_identity');
  return stored ? JSON.parse(stored) : null;
}

// Store prescription in localStorage (demo purposes)
export function storePrescription(prescription: Prescription): void {
  if (typeof window === 'undefined') return;

  const stored = localStorage.getItem('prescriptions');
  const prescriptions: Prescription[] = stored ? JSON.parse(stored) : [];

  prescriptions.push(prescription);
  localStorage.setItem('prescriptions', JSON.stringify(prescriptions));
}

// Retrieve all prescriptions
export function retrievePrescriptions(): Prescription[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem('prescriptions');
  return stored ? JSON.parse(stored) : [];
}

// Get pending prescriptions (waiting for validation)
export function getPendingPrescriptions(): Prescription[] {
  return retrievePrescriptions().filter(p => p.status === 'pending');
}

// Update prescription with validator signature
export function updatePrescriptionWithValidation(
  prescriptionId: string,
  validatorSignature: any
): void {
  if (typeof window === 'undefined') return;

  const prescriptions = retrievePrescriptions();
  const index = prescriptions.findIndex(p => p.data.id === prescriptionId);

  if (index !== -1) {
    prescriptions[index].validatorSignature = validatorSignature;
    prescriptions[index].status = 'validated';
    localStorage.setItem('prescriptions', JSON.stringify(prescriptions));
  }
}

// Generate Semaphore ZK proof for prescription operations
export async function generateDoctorProof(
  identity: Identity,
  prescriptionHash: string,
  doctorGroup: Group
): Promise<any> {
  try {
    const message = BigInt('0x' + prescriptionHash.slice(2, 34));
    const scope = doctorGroup.root;

    const proof = await generateProof(identity, doctorGroup, message, scope);
    return proof;
  } catch (error) {
    console.error('Error generating doctor proof:', error);
    throw error;
  }
}

// Get nullifier from identity and prescription hash
export function getDoctorNullifier(identity: Identity, prescriptionHash: string): string {
  // Nullifier ensures same doctor can't sign same prescription twice
  const nullifier = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'bytes32'],
      [identity.commitment, prescriptionHash]
    )
  );
  return nullifier;
}
