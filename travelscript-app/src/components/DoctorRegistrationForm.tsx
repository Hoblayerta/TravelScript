import React, { useState } from "react";
import { useDoctorRegistration } from "../hooks/useDoctorRegistration";
import { ethers } from "ethers";

const DoctorRegistrationForm: React.FC = () => {
  const { doctor, registerDoctor } = useDoctorRegistration();
  const [name, setName] = useState("");
  const [license, setLicense] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    setLoading(true);
    setError("");
    try {
      // @ts-ignore
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      await registerDoctor(name, license, provider);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div>
      <h2>Doctor Registration</h2>
      {doctor ? (
        <div>
          <p><b>Name:</b> {doctor.name}</p>
          <p><b>License:</b> {doctor.license}</p>
          <p><b>Wallet:</b> {doctor.address}</p>
          <p><b>Semaphore Commitment:</b> {doctor.semaphoreCommitment}</p>
        </div>
      ) : (
        <div>
          <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <input placeholder="License" value={license} onChange={e => setLicense(e.target.value)} />
          <button onClick={handleRegister} disabled={loading}>
            {loading ? "Registering..." : "Register as Doctor"}
          </button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
      )}
    </div>
  );
};

export default DoctorRegistrationForm;
