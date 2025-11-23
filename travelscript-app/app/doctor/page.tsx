'use client';

import { useState, useEffect } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import {
  createDoctorIdentity,
  storeDoctorIdentity,
  retrieveDoctorIdentity,
  storePrescription,
  retrievePrescriptions,
  hashPrescription,
} from '@/lib/semaphore';
import type { DoctorIdentity, Prescription, PrescriptionData } from '@/types/prescription';

export default function DoctorPortal() {
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();

  const [doctorIdentity, setDoctorIdentity] = useState<DoctorIdentity | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  // Registration form
  const [doctorName, setDoctorName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [country, setCountry] = useState('');

  // Prescription form
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientId, setPatientId] = useState('');
  const [medication, setMedication] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const stored = retrieveDoctorIdentity();
    if (stored && stored.walletAddress === address) {
      setDoctorIdentity(stored);
      setIsRegistered(true);
    }

    const storedPrescriptions = retrievePrescriptions();
    setPrescriptions(storedPrescriptions);
  }, [address]);

  const handleRegister = async () => {
    if (!address || !doctorName || !licenseNumber || !country) {
      alert('Por favor completa todos los campos');
      return;
    }

    try {
      const { identity, commitment, privateKey } = createDoctorIdentity(address);

      const timestamp = Date.now();

      const doctor: DoctorIdentity = {
        semaphoreIdentity: privateKey,
        commitment,
        walletAddress: address,
        country,
        name: doctorName,
        licenseNumber,
        registrationTimestamp: timestamp,
      };

      storeDoctorIdentity(doctor);
      setDoctorIdentity(doctor);
      setIsRegistered(true);
      alert(
        '✅ Registro exitoso!\n\nTu identidad Semaphore ha sido creada.\nAhora puedes firmar recetas usando ZK proofs en Flare EVVM.'
      );
    } catch (error) {
      console.error('Error during registration:', error);
      alert('❌ Error durante el registro.\n\nInténtalo nuevamente.');
    }
  };

  const handleCreatePrescription = async () => {
    if (!doctorIdentity || !isConnected) {
      alert('Debes estar registrado y conectado');
      return;
    }

    // Verify current wallet matches registered wallet
    if (doctorIdentity.walletAddress.toLowerCase() !== address?.toLowerCase()) {
      alert('❌ Wallet no coincide\n\nDebes usar la wallet con la que te registraste.');
      return;
    }

    if (!patientName || !medication || !dosage || !frequency || !duration) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      const prescriptionData: PrescriptionData = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        patientName,
        patientAge: parseInt(patientAge) || 0,
        patientId,
        medication,
        dosage,
        frequency,
        duration,
        notes,
        createdAt: Date.now(),
      };

      const prescription: Prescription = {
        data: prescriptionData,
        issuerSignature: {
          doctorCommitment: doctorIdentity.commitment,
          walletAddress: doctorIdentity.walletAddress,
          country: doctorIdentity.country,
          timestamp: Date.now(),
        },
        status: 'pending',
        prescriptionHash: '',
      };

      // Generate hash
      prescription.prescriptionHash = hashPrescription(prescription);

      // Store prescription locally first
      storePrescription(prescription);

      alert(
        `✅ Receta creada!\n\nID: ${prescription.data.id}\n\n⏳ Próximamente se almacenará en EVVM + Flare FDC\n\nPor ahora está guardada localmente y debe ser validada por un doctor del país destino.`
      );

      // TODO: Implement EVVM on-chain creation
      // This will be done after contract deployment
      // await createPrescriptionOnChain(prescription, proof, nullifier, provider)

      // Reset form
      setPatientName('');
      setPatientAge('');
      setPatientId('');
      setMedication('');
      setDosage('');
      setFrequency('');
      setDuration('');
      setNotes('');

      // Refresh prescriptions
      setPrescriptions(retrievePrescriptions());
    } catch (error) {
      console.error('Error creating prescription:', error);
      alert('❌ Error al crear la receta');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">👨‍⚕️ Portal Doctor</h1>
          <p className="text-gray-600 mb-6">
            Conecta tu wallet para acceder al portal de médicos
          </p>
          <button
            onClick={() => open()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Conectar Wallet
          </button>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 mt-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">👨‍⚕️ Registro de Doctor</h1>
          <p className="text-gray-600 mb-6">
            Crea tu identidad Semaphore para firmar recetas de forma privada
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Dr. Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Licencia *
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="MED-12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">País *</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecciona tu país</option>
                <option value="MX">México</option>
                <option value="US">Estados Unidos</option>
                <option value="ES">España</option>
                <option value="AR">Argentina</option>
                <option value="CO">Colombia</option>
                <option value="CL">Chile</option>
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>🔒 Privacidad:</strong> Tu identidad Semaphore te permite firmar recetas de
                forma anónima usando pruebas de conocimiento cero (ZK proofs).
              </p>
            </div>

            <button
              onClick={handleRegister}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Registrarse como Doctor
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">👨‍⚕️ Portal Doctor</h1>
              <p className="text-gray-600">Dr. {doctorIdentity?.name}</p>
              <p className="text-sm text-gray-500">
                País: {doctorIdentity?.country} | Licencia: {doctorIdentity?.licenseNumber}
              </p>
            </div>
            <button
              onClick={() => open()}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Prescription Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📝 Crear Receta</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Paciente *
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Juan López"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="35"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Paciente
                  </label>
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="ID-12345"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medicamento *
                </label>
                <input
                  type="text"
                  value={medication}
                  onChange={(e) => setMedication(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ibuprofeno"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dosis *</label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="400mg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frecuencia *
                </label>
                <input
                  type="text"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Cada 8 horas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duración *
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="7 días"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas Adicionales
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Instrucciones especiales..."
                />
              </div>

              <button
                onClick={handleCreatePrescription}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Crear Receta (Firma 1/2)
              </button>
            </div>
          </div>

          {/* Prescriptions List */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Mis Recetas</h2>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {prescriptions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay recetas creadas aún</p>
              ) : (
                prescriptions.map((prescription) => (
                  <div
                    key={prescription.data.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {prescription.data.patientName}
                        </h3>
                        <p className="text-sm text-gray-500">ID: {prescription.data.id}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          prescription.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : prescription.status === 'validated'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {prescription.status === 'pending'
                          ? '⏳ Pendiente validación'
                          : prescription.status === 'validated'
                          ? '✅ Validada'
                          : '💊 Dispensada'}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <strong>Medicamento:</strong> {prescription.data.medication}
                      </p>
                      <p>
                        <strong>Dosis:</strong> {prescription.data.dosage}
                      </p>
                      <p>
                        <strong>Frecuencia:</strong> {prescription.data.frequency}
                      </p>
                      <p>
                        <strong>Duración:</strong> {prescription.data.duration}
                      </p>
                      {prescription.data.notes && (
                        <p className="text-xs text-gray-500 mt-2">{prescription.data.notes}</p>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Firma 1: {prescription.issuerSignature.country} •{' '}
                        {new Date(prescription.issuerSignature.timestamp).toLocaleString()}
                      </p>
                      {prescription.validatorSignature && (
                        <p className="text-xs text-green-600">
                          Firma 2: {prescription.validatorSignature.country} •{' '}
                          {new Date(prescription.validatorSignature.timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
