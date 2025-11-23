/**
 * Real Flare Data Connector (FDC) Client Implementation
 * Complete integration with FDC verifiers and DAL
 */

import { ethers } from 'ethers';

// FDC Configuration for Coston2 Testnet
export const FDC_CONFIG = {
  verifierUrl: 'https://fdc-verifiers-testnet.flare.network/',
  dalUrl: 'https://fdc-dal-testnet.flare.network/',
  fdcHubAddress: '0x1c78A073E3BD2aCa4cc327d55FB0cD4f0549B55b',
  chain: 'coston2',
  roundDuration: 90, // seconds
  attestationType: 'JsonApi',
  sourceId: 'travelscript',
};

export interface FDCAttestationRequest {
  attestationType: string;
  sourceId: string;
  requestBody: {
    url: string;
    jq_transformation?: string;
  };
}

export interface FDCAttestationResponse {
  status: 'VALID' | 'INVALID' | 'INDETERMINATE';
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

export interface FDCProof {
  merkleProof: string[];
  data: {
    attestationType: string;
    sourceId: string;
    votingRound: string;
    lowestUsedTimestamp: string;
    requestBody: any;
    responseBody: any;
  };
}

/**
 * FDC Client for interacting with Flare Data Connector
 */
export class FDCClient {
  private verifierUrl: string;
  private dalUrl: string;
  private fdcHubAddress: string;

  constructor(config = FDC_CONFIG) {
    this.verifierUrl = config.verifierUrl;
    this.dalUrl = config.dalUrl;
    this.fdcHubAddress = config.fdcHubAddress;
  }

  /**
   * Request attestation from FDC verifiers
   */
  async requestAttestation(
    dataUrl: string,
    jqTransformation: string = '.'
  ): Promise<FDCAttestationResponse> {
    try {
      const attestationType = ethers.zeroPadValue(
        ethers.toUtf8Bytes(FDC_CONFIG.attestationType),
        32
      );
      const sourceId = ethers.zeroPadValue(
        ethers.toUtf8Bytes(FDC_CONFIG.sourceId),
        32
      );

      const request: FDCAttestationRequest = {
        attestationType,
        sourceId,
        requestBody: {
          url: dataUrl,
          jq_transformation: jqTransformation,
        },
      };

      console.log('[FDC] Requesting attestation for:', dataUrl);

      const response = await fetch(this.verifierUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`FDC verifier request failed: ${response.statusText}`);
      }

      const attestationResponse: FDCAttestationResponse = await response.json();

      console.log('[FDC] Attestation response:', attestationResponse);

      return attestationResponse;
    } catch (error) {
      console.error('[FDC] Attestation request error:', error);
      throw error;
    }
  }

  /**
   * Get attestation proof from DAL after round finalization
   */
  async getProofFromDAL(votingRound: string, requestId: string): Promise<FDCProof> {
    try {
      const url = `${this.dalUrl}/proof/${votingRound}/${FDC_CONFIG.sourceId}/${requestId}`;

      console.log('[FDC] Retrieving proof from DAL:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`DAL proof retrieval failed: ${response.statusText}`);
      }

      const proof: FDCProof = await response.json();

      console.log('[FDC] Proof retrieved successfully');

      return proof;
    } catch (error) {
      console.error('[FDC] DAL proof retrieval error:', error);
      throw error;
    }
  }

  /**
   * Verify attestation proof on-chain using FDCHub
   */
  async verifyProofOnChain(
    proof: FDCProof,
    provider: ethers.BrowserProvider
  ): Promise<boolean> {
    try {
      const fdcHub = new ethers.Contract(
        this.fdcHubAddress,
        [
          'function verifyAttestation(bytes32 attestationType, bytes32 sourceId, bytes calldata proof) external view returns (bool)',
        ],
        provider
      );

      console.log('[FDC] Verifying proof on-chain...');

      // Encode proof for on-chain verification
      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ['tuple(string[] merkleProof, tuple(string attestationType, string sourceId, string votingRound, string lowestUsedTimestamp, string requestBody, string responseBody) data)'],
        [proof]
      );

      const attestationType = ethers.zeroPadValue(
        ethers.toUtf8Bytes(FDC_CONFIG.attestationType),
        32
      );
      const sourceId = ethers.zeroPadValue(
        ethers.toUtf8Bytes(FDC_CONFIG.sourceId),
        32
      );

      const isValid = await fdcHub.verifyAttestation(
        attestationType,
        sourceId,
        encodedProof
      );

      console.log('[FDC] On-chain verification result:', isValid);

      return isValid;
    } catch (error) {
      console.error('[FDC] On-chain verification error:', error);
      return false;
    }
  }

  /**
   * Complete attestation flow with waiting for finalization
   */
  async attestAndVerify(
    dataUrl: string,
    requestId: string,
    provider: ethers.BrowserProvider,
    onProgress?: (step: string, details?: any) => void
  ): Promise<{
    attestationHash: string;
    votingRound: string;
    proof: FDCProof;
    verified: boolean;
  }> {
    try {
      // Step 1: Request attestation
      onProgress?.('Requesting FDC attestation...');
      const attestationResponse = await this.requestAttestation(dataUrl);

      if (attestationResponse.status !== 'VALID' || !attestationResponse.response) {
        throw new Error(
          `Attestation failed: ${attestationResponse.error || 'Unknown error'}`
        );
      }

      const { votingRound, responseBody } = attestationResponse.response;

      // Calculate attestation hash
      const attestationHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(attestationResponse.response))
      );

      // Step 2: Wait for round finalization
      const waitTime = FDC_CONFIG.roundDuration;
      onProgress?.('Waiting for voting round finalization...', {
        votingRound,
        waitTimeSeconds: waitTime,
      });

      await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));

      // Step 3: Retrieve proof from DAL
      onProgress?.('Retrieving proof from DAL...');
      const proof = await this.getProofFromDAL(votingRound, requestId);

      // Step 4: Verify on-chain
      onProgress?.('Verifying proof on-chain...');
      const verified = await this.verifyProofOnChain(proof, provider);

      onProgress?.('FDC attestation complete!', { verified });

      return {
        attestationHash,
        votingRound,
        proof,
        verified,
      };
    } catch (error) {
      console.error('[FDC] Complete attestation flow error:', error);
      throw error;
    }
  }

  /**
   * Attest prescription metadata
   */
  async attestPrescriptionMetadata(
    prescriptionId: string,
    metadata: any,
    provider: ethers.BrowserProvider,
    onProgress?: (step: string, details?: any) => void
  ): Promise<{
    attestationHash: string;
    votingRound: string;
    verified: boolean;
  }> {
    // In a real implementation, you would:
    // 1. Upload metadata to IPFS or a public API endpoint
    // 2. Get the public URL
    // 3. Request FDC attestation for that URL

    // For MVP with mock data endpoint
    const metadataUrl = `https://api.travelscript.health/prescription/${prescriptionId}`;

    // Store metadata locally for testing
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `prescription-metadata-${prescriptionId}`,
        JSON.stringify(metadata)
      );
    }

    const result = await this.attestAndVerify(
      metadataUrl,
      prescriptionId,
      provider,
      onProgress
    );

    return {
      attestationHash: result.attestationHash,
      votingRound: result.votingRound,
      verified: result.verified,
    };
  }
}

// Export singleton instance
export const fdcClient = new FDCClient();
