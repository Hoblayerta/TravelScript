'use client';

import { useState, useEffect } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import {
  retrieveDoctorIdentity,
  getPendingPrescriptions,
  updatePrescriptionWithValidation,
  retrievePrescriptions,
} from '@/lib/semaphore';
import type { DoctorIdentity, Prescription } from '@/types/prescription';
import Link from 'next/link';

export default function ValidatePortal() {
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();

  const [doctorIdentity, setDoctorIdentity] = useState<DoctorIdentity | null>(null);
  const [pendingPrescriptions, setPendingPrescriptions] = useState<Prescription[]>([]);
  const [validatedPrescriptions, setValidatedPrescriptions] = useState<Prescription[]>([]);

  useEffect(() => {
    const stored = retrieveDoctorIdentity();
    if (stored && stored.walletAddress === address) {
      setDoctorIdentity(stored);
    }

    loadPrescriptions();
  }, [address]);

  const loadPrescriptions = () => {
    const pending = getPendingPrescriptions();
    setPendingPrescriptions(pending);

    const all = retrievePrescriptions();
    const validated = all.filter(p => p.status === 'validated');
    setValidatedPrescriptions(validated);
  };

  const handleValidate = (prescription: Prescription) => {
    if (!doctorIdentity) {
      alert('Debes estar registrado como doctor');
      return;
    }

    if (doctorIdentity.country === prescription.issuerSignature.country) {
      alert('No puedes validar una receta del mismo país emisor');
      return;
    }

    const confirmed = confirm(
      `¿Confirmar validación de receta?\n\nPaciente: ${prescription.data.patientName}\nMedicamento: ${prescription.data.medication}\nDosis: ${prescription.data.dosage}\n\nTu firma (${doctorIdentity.country}) será agregada como validador.`
    );

    if (!confirmed) return;

    const validatorSignature = {
      doctorCommitment: doctorIdentity.commitment,
      walletAddress: doctorIdentity.walletAddress,
      country: doctorIdentity.country,
      timestamp: Date.now(),
    };

    updatePrescriptionWithValidation(prescription.data.id, validatorSignature);

    alert('✅ Receta validada exitosamente!\n\nAhora tiene las dos firmas requeridas.');

    loadPrescriptions();
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">🔐 Validar Recetas</h1>
          <p className="text-gray-600 mb-6">
            Conecta tu wallet para validar recetas internacionales
          </p>
          <button
            onClick={() => open()}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
          >
            Conectar Wallet
          </button>
        </div>
      </div>
    );
  }

  if (!doctorIdentity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">🔐 Validar Recetas</h1>
          <p className="text-gray-600 mb-6">Debes registrarte primero como doctor</p>
          <Link
            href="/doctor"
            className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
          >
            Ir a Registro
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🔐 Portal de Validación</h1>
              <p className="text-gray-600">Dr. {doctorIdentity.name} - {doctorIdentity.country}</p>
              <p className="text-sm text-gray-500">
                Valida recetas de otros países con tu firma ZK
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/doctor"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
              >
                ← Portal Doctor
              </Link>
              <button
                onClick={() => open()}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition text-sm"
              >
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Prescriptions */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              ⏳ Recetas Pendientes ({pendingPrescriptions.length})
            </h2>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {pendingPrescriptions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-2">No hay recetas pendientes</p>
                  <p className="text-xs text-gray-400">
                    Las recetas creadas por doctores aparecerán aquí
                  </p>
                </div>
              ) : (
                pendingPrescriptions.map((prescription) => (
                  <div
                    key={prescription.data.id}
                    className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {prescription.data.patientName}
                        </h3>
                        <p className="text-xs text-gray-500">ID: {prescription.data.id}</p>
                      </div>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                        Requiere firma 2
                      </span>
                    </div>

                    <div className="bg-white rounded p-3 mb-3">
                      <div className="text-sm text-gray-700 space-y-1">
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
                          <p className="text-xs text-gray-500 mt-2 pt-2 border-t">
                            Notas: {prescription.data.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
                      <p className="text-xs text-blue-800">
                        <strong>Firma 1 (Emisor):</strong> {prescription.issuerSignature.country}{' '}
                        •{' '}
                        {prescription.issuerSignature.walletAddress.slice(0, 6)}...
                        {prescription.issuerSignature.walletAddress.slice(-4)}
                      </p>
                      <p className="text-xs text-blue-600">
                        {new Date(prescription.issuerSignature.timestamp).toLocaleString()}
                      </p>
                    </div>

                    {prescription.issuerSignature.country === doctorIdentity.country ? (
                      <button
                        disabled
                        className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed"
                      >
                        No puedes validar recetas de tu país
                      </button>
                    ) : (
                      <button
                        onClick={() => handleValidate(prescription)}
                        className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-semibold"
                      >
                        Validar con mi firma ({doctorIdentity.country})
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Validated Prescriptions */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              ✅ Recetas Validadas ({validatedPrescriptions.length})
            </h2>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {validatedPrescriptions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-2">No hay recetas validadas</p>
                  <p className="text-xs text-gray-400">
                    Las recetas que valides aparecerán aquí
                  </p>
                </div>
              ) : (
                validatedPrescriptions.map((prescription) => (
                  <div
                    key={prescription.data.id}
                    className="border-2 border-green-200 bg-green-50 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {prescription.data.patientName}
                        </h3>
                        <p className="text-xs text-gray-500">ID: {prescription.data.id}</p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        ✅ Validada (2/2)
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1 mb-3">
                      <p>
                        <strong>Medicamento:</strong> {prescription.data.medication}
                      </p>
                      <p>
                        <strong>Dosis:</strong> {prescription.data.dosage}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="text-xs text-blue-800">
                          <strong>Firma 1:</strong> {prescription.issuerSignature.country}
                        </p>
                      </div>
                      {prescription.validatorSignature && (
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <p className="text-xs text-green-800">
                            <strong>Firma 2:</strong> {prescription.validatorSignature.country}
                          </p>
                        </div>
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
