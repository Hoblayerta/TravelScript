import { useState } from "react";
import { Identity } from "@semaphore-protocol/identity";
import { Group } from "@semaphore-protocol/group";
import { generateProof } from "@semaphore-protocol/proof";
import { ethers } from "ethers";

export type Doctor = {
  address: string;
  semaphoreCommitment: string;
  name: string;
  license: string;
};

export function useDoctorRegistration() {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);

  // Registro: conecta wallet y genera identidad Semaphore
  async function registerDoctor(name: string, license: string, provider: ethers.providers.Web3Provider) {
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const identity = new Identity();
    setIdentity(identity);
    const semaphoreCommitment = identity.commitment.toString();
    const newDoctor: Doctor = { address, semaphoreCommitment, name, license };
    setDoctor(newDoctor);
    localStorage.setItem("doctor", JSON.stringify(newDoctor));
    localStorage.setItem("doctorIdentity", identity.toString());
    return newDoctor;
  }

  // Firma receta con wallet
  async function signPrescription(prescriptionData: any, provider: ethers.providers.Web3Provider) {
    if (!doctor) throw new Error("Doctor not registered");
    const signer = provider.getSigner();
    const message = JSON.stringify({ ...prescriptionData, doctorAddress: doctor.address, doctorSemaphoreCommitment: doctor.semaphoreCommitment });
    const signature = await signer.signMessage(message);
    return { ...prescriptionData, doctorAddress: doctor.address, doctorSemaphoreCommitment: doctor.semaphoreCommitment, doctorSignature: signature };
  }

  // Valida receta: genera prueba ZK y firma
  async function validatePrescription(prescription: any, allCommitments: string[], provider: ethers.providers.Web3Provider) {
    if (!identity || !doctor) throw new Error("Doctor not registered");
    const group = new Group(allCommitments);
    const proof = await generateProof(identity, group, 1, group.root);
    const signer = provider.getSigner();
    const message = JSON.stringify(prescription);
    const validatorSignature = await signer.signMessage(message);
    return { ...prescription, validatorAddress: doctor.address, validatorSemaphoreProof: proof, validatorSignature };
  }

  return { doctor, registerDoctor, signPrescription, validatePrescription };
}
