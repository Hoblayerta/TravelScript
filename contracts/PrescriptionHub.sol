// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface ISemaphore {
    function verifyProof(
        uint256 groupId,
        uint256 merkleTreeDepth,
        uint256 merkleTreeRoot,
        uint256 nullifier,
        uint256 message,
        uint256[8] calldata proof
    ) external view;
}

/// @title PrescriptionHub
/// @notice Dual-doctor verification system for international prescriptions
/// @dev Doctor 1 creates, Doctor 2 validates, both use Semaphore ZK proofs
contract PrescriptionHub {
    ISemaphore public semaphore;
    uint256 public doctorGroupId;

    struct Prescription {
        bytes32 prescriptionHash; // Hash of medication data
        bytes32 doctor1Nullifier; // Doctor who created prescription
        bytes32 doctor2Nullifier; // Doctor who validated prescription
        address patientAddress;
        uint256 timestamp;
        bool validated; // True when doctor2 signs
        bool active;
        bytes32 fdcAttestationHash; // FDC attestation
    }

    mapping(string => Prescription) public prescriptions;
    mapping(bytes32 => bool) public usedNullifiers;

    event PrescriptionCreated(
        string indexed prescriptionId,
        bytes32 prescriptionHash,
        bytes32 doctor1Nullifier,
        address indexed patient
    );

    event PrescriptionValidated(
        string indexed prescriptionId,
        bytes32 doctor2Nullifier
    );

    event PrescriptionAttested(
        string indexed prescriptionId,
        bytes32 fdcAttestationHash
    );

    constructor(address _semaphore, uint256 _doctorGroupId) {
        semaphore = ISemaphore(_semaphore);
        doctorGroupId = _doctorGroupId;
    }

    /// @notice Doctor 1 creates prescription (e.g., Argentina doctor)
    /// @param prescriptionId Unique ID
    /// @param prescriptionData Encoded (medication, dosage, duration)
    /// @param doctor1Proof Semaphore ZK proof
    /// @param doctor1Nullifier Semaphore nullifier
    /// @param patientAddress Patient's wallet
    function createPrescription(
        string calldata prescriptionId,
        bytes calldata prescriptionData,
        uint256[8] calldata doctor1Proof,
        bytes32 doctor1Nullifier,
        address patientAddress
    ) external {
        require(
            prescriptions[prescriptionId].timestamp == 0,
            "Prescription exists"
        );
        require(!usedNullifiers[doctor1Nullifier], "Nullifier used");

        bytes32 prescriptionHash = keccak256(prescriptionData);

        // Verify Doctor 1 ZK proof
        semaphore.verifyProof(
            doctorGroupId,
            20,
            0, // merkleTreeRoot
            uint256(doctor1Nullifier),
            uint256(prescriptionHash),
            doctor1Proof
        );

        prescriptions[prescriptionId] = Prescription({
            prescriptionHash: prescriptionHash,
            doctor1Nullifier: doctor1Nullifier,
            doctor2Nullifier: bytes32(0),
            patientAddress: patientAddress,
            timestamp: block.timestamp,
            validated: false,
            active: true,
            fdcAttestationHash: bytes32(0)
        });

        usedNullifiers[doctor1Nullifier] = true;

        emit PrescriptionCreated(
            prescriptionId,
            prescriptionHash,
            doctor1Nullifier,
            patientAddress
        );
    }

    /// @notice Doctor 2 validates prescription (e.g., local doctor in destination country)
    /// @param prescriptionId Prescription to validate
    /// @param doctor2Proof Semaphore ZK proof
    /// @param doctor2Nullifier Semaphore nullifier
    function validatePrescription(
        string calldata prescriptionId,
        uint256[8] calldata doctor2Proof,
        bytes32 doctor2Nullifier
    ) external {
        Prescription storage rx = prescriptions[prescriptionId];

        require(rx.timestamp > 0, "Prescription does not exist");
        require(!rx.validated, "Already validated");
        require(!usedNullifiers[doctor2Nullifier], "Nullifier used");

        // Verify Doctor 2 ZK proof (different doctor validates)
        semaphore.verifyProof(
            doctorGroupId,
            20,
            0,
            uint256(doctor2Nullifier),
            uint256(rx.prescriptionHash), // Same prescription hash
            doctor2Proof
        );

        rx.doctor2Nullifier = doctor2Nullifier;
        rx.validated = true;

        usedNullifiers[doctor2Nullifier] = true;

        emit PrescriptionValidated(prescriptionId, doctor2Nullifier);
    }

    /// @notice Store FDC attestation after both doctors sign
    function attestPrescription(
        string calldata prescriptionId,
        bytes32 fdcAttestationHash
    ) external {
        Prescription storage rx = prescriptions[prescriptionId];

        require(rx.timestamp > 0, "Prescription does not exist");
        require(rx.validated, "Not validated by doctor 2");
        require(rx.fdcAttestationHash == bytes32(0), "Already attested");

        rx.fdcAttestationHash = fdcAttestationHash;

        emit PrescriptionAttested(prescriptionId, fdcAttestationHash);
    }

    /// @notice Pharmacy verifies prescription can be filled
    function canFillPrescription(string calldata prescriptionId)
        external
        view
        returns (bool canFill, string memory reason)
    {
        Prescription memory rx = prescriptions[prescriptionId];

        if (rx.timestamp == 0) {
            return (false, "Prescription does not exist");
        }

        if (!rx.active) {
            return (false, "Prescription revoked");
        }

        if (!rx.validated) {
            return (false, "Not validated by second doctor");
        }

        if (rx.fdcAttestationHash == bytes32(0)) {
            return (false, "Not attested by FDC");
        }

        return (true, "Valid - both doctors verified via ZK proof");
    }

    /// @notice Patient revokes prescription
    function revokePrescription(string calldata prescriptionId) external {
        require(
            prescriptions[prescriptionId].patientAddress == msg.sender,
            "Only patient"
        );

        prescriptions[prescriptionId].active = false;
    }
}
