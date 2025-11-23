/**
 * Flare Data Connector (FDC) Attestation Service
 * Stores prescription metadata using FDC Web2-JSON attestations
 */

import { ethers } from 'ethers';
import type { Prescription } from '@/types/prescription';

// FDC Configuration for Coston2 Testnet
const FDC_CONFIG = {
  verifierUrl: 'https://fdc-verifiers-testnet.flare.network/',
  dalUrl: 'https://fdc-dal-testnet.flare.network/',
  fdcHubAddress: '0x1c78A073E3BD2aCa4cc327d55FB0cD4f0549B55b',
  chain: 'coston2',
  roundDuration: 90, // seconds
};

export interface AttestationRequest {
  attestationType: string;
  sourceId: string;
  requestBody: {
    url: string;
    jq_transformation: string;
  };
}

export interface AttestationResponse {
  status: string;
  response?: {
    attestationType: string;
    sourceId: string;
    votingRound: string;
    lowestUsedTimestamp: string;
    requestBody: any;
    responseBody: any;
  };
  error?: string;
}

export interface PrescriptionMetadata {
  prescriptionId: string;
  prescriptionHash: string;
  issuer: {
    commitment: string;
    walletAddress: string;
    country: string;
    timestamp: number;
  };
  validator?: {
    commitment: string;
    walletAddress: string;
    country: string;
    timestamp: number;
  };
  data: {
    patientName: string;
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
  };
  status: string;
  createdAt: number;
  validatedAt?: number;
}

/**
 * Request FDC attestation for prescription metadata
 * Using Web2-JSON attestation type to store prescription data
 */
export async function requestPrescriptionAttestation(
  prescription: Prescription
): Promise<{ attestationHash: string; votingRound: string }> {
  try {
    // Prepare metadata object
    const metadata: PrescriptionMetadata = {
      prescriptionId: prescription.data.id,
      prescriptionHash: prescription.prescriptionHash,
      issuer: {
        commitment: prescription.issuerSignature.doctorCommitment,
        walletAddress: prescription.issuerSignature.walletAddress,
        country: prescription.issuerSignature.country,
        timestamp: prescription.issuerSignature.timestamp,
      },
      data: {
        patientName: prescription.data.patientName,
        medication: prescription.data.medication,
        dosage: prescription.data.dosage,
        frequency: prescription.data.frequency,
        duration: prescription.data.duration,
      },
      status: prescription.status,
      createdAt: prescription.data.createdAt,
    };

    // Add validator if exists
    if (prescription.validatorSignature) {
      metadata.validator = {
        commitment: prescription.validatorSignature.doctorCommitment,
        walletAddress: prescription.validatorSignature.walletAddress,
        country: prescription.validatorSignature.country,
        timestamp: prescription.validatorSignature.timestamp,
      };
      metadata.validatedAt = prescription.validatorSignature.timestamp;
    }

    // Store metadata in a public accessible JSON endpoint
    // For hackathon, we'll use IPFS or a simple API endpoint    // In production, this would be your backend API
    const metadataUrl = await uploadMetadataToIPFS(metadata);

    // Create FDC attestation request
    const attestationType = ethers.zeroPadValue(ethers.toUtf8Bytes('JsonApi'), 32);
    const sourceId = ethers.zeroPadValue(ethers.toUtf8Bytes('travelscript'), 32);

    const request: AttestationRequest = {
      attestationType,
      sourceId,
      requestBody: {
        url: metadataUrl,
        jq_transformation: '.', // Return entire JSON
      },
    };

    // Send attestation request to FDC verifiers
    const response = await fetch(FDC_CONFIG.verifierUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`FDC request failed: ${response.statusText}`);
    }

    const attestationResponse: AttestationResponse = await response.json();

    if (attestationResponse.status !== 'VALID' || !attestationResponse.response) {
      throw new Error(
        `Attestation failed: ${attestationResponse.error || 'Unknown error'}`
      );
    }

    // Hash the attestation response for on-chain storage
    const attestationHash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(attestationResponse.response))
    );

    return {
      attestationHash,
      votingRound: attestationResponse.response.votingRound,
    };
  } catch (error) {
    console.error('FDC attestation error:', error);
    throw error;
  }
}

/**
 * Upload metadata to IPFS for FDC accessibility
 * For MVP, using a mock public URL
 */
async function uploadMetadataToIPFS(metadata: PrescriptionMetadata): Promise<string> {
  // TODO: Implement real IPFS upload using Pinata, web3.storage, or Infura
  // For now, return a mock URL that would be replaced in production

  // Option 1: Use Pinata IPFS service
  // const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
  // const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

  // Option 2: Use Web3.Storage
  // const web3storage = new Web3Storage({ token: process.env.NEXT_PUBLIC_WEB3STORAGE_TOKEN });

  // For hackathon MVP - use localStorage and return a mock URL
  // In production, this MUST be a real publicly accessible URL
  if (typeof window !== 'undefined') {
    localStorage.setItem(`prescription-metadata-${metadata.prescriptionId}`, JSON.stringify(metadata));
  }

  // Mock URL - replace with real IPFS URL in production
  return `https://api.travelscript.health/prescription/${metadata.prescriptionId}`;
}

/**
 * Query FDC Data Availability Layer for attestation proof
 * After waiting for round finalization (~90-180 seconds)
 */
export async function getAttestationProof(
  votingRound: string,
  prescriptionId: string
): Promise<any> {
  try {
    const response = await fetch(
      `${FDC_CONFIG.dalUrl}/proof/${votingRound}/travelscript/${prescriptionId}`
    );

    if (!response.ok) {
      throw new Error(`DAL query failed: ${response.statusText}`);
    }

    const proof = await response.json();
    return proof;
  } catch (error) {
    console.error('DAL query error:', error);
    throw error;
  }
}

/**
 * Verify attestation proof on-chain using FDCHub contract
 */
export async function verifyAttestationOnChain(
  proof: any,
  provider: ethers.BrowserProvider
): Promise<boolean> {
  try {
    const fdcHub = new ethers.Contract(
      FDC_CONFIG.fdcHubAddress,
      [
        'function verifyAttestation(bytes calldata attestation) external view returns (bool)',
      ],
      provider
    );

    const isValid = await fdcHub.verifyAttestation(proof);
    return isValid;
  } catch (error) {
    console.error('On-chain verification error:', error);
    return false;
  }
}

/**
 * Complete flow: Request → Wait → Retrieve → Verify
 */
export async function attestAndVerifyPrescription(
  prescription: Prescription,
  provider: ethers.BrowserProvider
): Promise<{ attestationHash: string; verified: boolean }> {
  // Step 1: Request attestation
  const { attestationHash, votingRound } = await requestPrescriptionAttestation(
    prescription
  );

  // Step 2: Wait for round finalization
  console.log(`Waiting for voting round ${votingRound} to finalize...`);
  await new Promise((resolve) => setTimeout(resolve, FDC_CONFIG.roundDuration * 1000));

  // Step 3: Retrieve proof from DAL
  const proof = await getAttestationProof(votingRound, prescription.data.id);

  // Step 4: Verify on-chain
  const verified = await verifyAttestationOnChain(proof, provider);

  return { attestationHash, verified };
}
