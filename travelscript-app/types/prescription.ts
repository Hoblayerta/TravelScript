export interface PrescriptionData {
  id: string;
  patientName: string;
  patientAge: number;
  patientId: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
  createdAt: number;
}

export interface DoctorSignature {
  doctorCommitment: string; // Semaphore identity commitment
  walletAddress: string;
  country: string;
  timestamp: number;
  proof?: any; // Semaphore proof
}

export interface Prescription {
  data: PrescriptionData;
  issuerSignature: DoctorSignature; // Doctor emisor
  validatorSignature?: DoctorSignature; // Doctor validador
  status: 'pending' | 'validated' | 'dispensed';
  prescriptionHash: string;
}

export interface DoctorIdentity {
  semaphoreIdentity: string; // Base64 encoded
  commitment: string;
  walletAddress: string;
  country: string;
  name: string;
  licenseNumber: string;
  walletSignature: string; // ERC-191 signature linking wallet to commitment
  registrationTimestamp: number;
}
