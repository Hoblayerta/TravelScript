'use client';

import { useState, useEffect } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { retrievePrescriptions } from '@/lib/semaphore';
import type { Prescription } from '@/types/prescription';

export default function PharmacyPortal() {
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [validatedPrescriptions, setValidatedPrescriptions] = useState<Prescription[]>([]);
  const [searchId, setSearchId] = useState('');
  const [foundPrescription, setFoundPrescription] = useState<Prescription | null>(null);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = () => {
    const all = retrievePrescriptions();
    setPrescriptions(all);

    const validated = all.filter(p => p.status === 'validated');
    setValidatedPrescriptions(validated);
  };

  const handleSearch = () => {
    if (!searchId) {
      alert('Ingresa un ID de receta');
      return;
    }

    const found = prescriptions.find(p => p.data.id === searchId);

    if (!found) {
      alert('Receta no encontrada');
      setFoundPrescription(null);
      return;
    }

    setFoundPrescription(found);
  };

  const handleDispense = (prescription: Prescription) => {
    if (prescription.status !== 'validated') {
      alert('⚠️ Esta receta no tiene las dos firmas requeridas\n\nNo se puede dispensar.');
      return;
    }

    const confirmed = confirm(
      `¿Confirmar dispensación?\n\nPaciente: ${prescription.data.patientName}\nMedicamento: ${prescription.data.medication}\nDosis: ${prescription.data.dosage}\n\n✅ Receta validada con 2 firmas\n✅ Firma 1: ${prescription.issuerSignature.country}\n✅ Firma 2: ${prescription.validatorSignature?.country}`
    );

    if (!confirmed) return;

    // Update prescription status to dispensed
    const all = retrievePrescriptions();
    const index = all.findIndex(p => p.data.id === prescription.data.id);

    if (index !== -1) {
      all[index].status = 'dispensed';
      localStorage.setItem('prescriptions', JSON.stringify(all));

      alert('✅ Medicamento dispensado exitosamente!');
      loadPrescriptions();
      setFoundPrescription(null);
      setSearchId('');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">💊 Portal Farmacia</h1>
          <p className="text-gray-600 mb-6">Conecta tu wallet para dispensar medicamentos</p>
          <button
            onClick={() => open()}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
          >
            Conectar Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">💊 Portal Farmacia</h1>
              <p className="text-gray-600">Dispensación de medicamentos con doble firma</p>
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
          {/* Search Prescription */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🔍 Buscar Receta</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID de Receta
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Ingresa el ID de la receta"
                  />
                  <button
                    onClick={handleSearch}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              {foundPrescription && (
                <div className={`border-2 rounded-lg p-4 ${
                  foundPrescription.status === 'validated'
                    ? 'border-green-200 bg-green-50'
                    : foundPrescription.status === 'pending'
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {foundPrescription.data.patientName}
                      </h3>
                      <p className="text-xs text-gray-500">ID: {foundPrescription.data.id}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      foundPrescription.status === 'validated'
                        ? 'bg-green-100 text-green-800'
                        : foundPrescription.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {foundPrescription.status === 'validated'
                        ? '✅ Validada (2/2)'
                        : foundPrescription.status === 'pending'
                        ? '⏳ Pendiente (1/2)'
                        : '💊 Dispensada'}
                    </span>
                  </div>

                  <div className="bg-white rounded p-4 mb-3">
                    <h4 className="font-semibold text-gray-800 mb-2">📋 Información del Paciente</h4>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p><strong>Edad:</strong> {foundPrescription.data.patientAge} años</p>
                      {foundPrescription.data.patientId && (
                        <p><strong>ID Paciente:</strong> {foundPrescription.data.patientId}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded p-4 mb-3">
                    <h4 className="font-semibold text-gray-800 mb-2">💊 Prescripción</h4>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p><strong>Medicamento:</strong> {foundPrescription.data.medication}</p>
                      <p><strong>Dosis:</strong> {foundPrescription.data.dosage}</p>
                      <p><strong>Frecuencia:</strong> {foundPrescription.data.frequency}</p>
                      <p><strong>Duración:</strong> {foundPrescription.data.duration}</p>
                      {foundPrescription.data.notes && (
                        <p className="text-xs text-gray-500 mt-2 pt-2 border-t">
                          <strong>Notas:</strong> {foundPrescription.data.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-xs text-blue-800 font-semibold mb-1">
                        🔐 Firma 1 (Doctor Emisor)
                      </p>
                      <p className="text-xs text-blue-700">
                        País: {foundPrescription.issuerSignature.country} •{' '}
                        {foundPrescription.issuerSignature.walletAddress.slice(0, 6)}...
                        {foundPrescription.issuerSignature.walletAddress.slice(-4)}
                      </p>
                      <p className="text-xs text-blue-600">
                        {new Date(foundPrescription.issuerSignature.timestamp).toLocaleString()}
                      </p>
                    </div>

                    {foundPrescription.validatorSignature ? (
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <p className="text-xs text-green-800 font-semibold mb-1">
                          ✅ Firma 2 (Doctor Validador)
                        </p>
                        <p className="text-xs text-green-700">
                          País: {foundPrescription.validatorSignature.country} •{' '}
                          {foundPrescription.validatorSignature.walletAddress.slice(0, 6)}...
                          {foundPrescription.validatorSignature.walletAddress.slice(-4)}
                        </p>
                        <p className="text-xs text-green-600">
                          {new Date(foundPrescription.validatorSignature.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <p className="text-xs text-yellow-800 font-semibold">
                          ⏳ Falta firma del doctor validador
                        </p>
                        <p className="text-xs text-yellow-700">
                          La receta requiere una segunda firma de un doctor del país destino
                        </p>
                      </div>
                    )}
                  </div>

                  {foundPrescription.status === 'dispensed' ? (
                    <button
                      disabled
                      className="w-full bg-gray-300 text-gray-600 px-6 py-3 rounded-lg cursor-not-allowed font-semibold"
                    >
                      Ya Dispensada
                    </button>
                  ) : foundPrescription.status === 'validated' ? (
                    <button
                      onClick={() => handleDispense(foundPrescription)}
                      className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
                    >
                      Dispensar Medicamento
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-yellow-300 text-yellow-800 px-6 py-3 rounded-lg cursor-not-allowed font-semibold"
                    >
                      Receta Incompleta (Falta Firma 2)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Validated Prescriptions List */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              ✅ Recetas Validadas ({validatedPrescriptions.length})
            </h2>

            <div className="space-y-3 max-h-[700px] overflow-y-auto">
              {validatedPrescriptions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-2">No hay recetas validadas</p>
                  <p className="text-xs text-gray-400">
                    Las recetas con doble firma aparecerán aquí
                  </p>
                </div>
              ) : (
                validatedPrescriptions.map((prescription) => (
                  <div
                    key={prescription.data.id}
                    className={`border-2 rounded-lg p-3 cursor-pointer hover:shadow-md transition ${
                      prescription.status === 'dispensed'
                        ? 'border-gray-200 bg-gray-50'
                        : 'border-green-200 bg-green-50'
                    }`}
                    onClick={() => {
                      setSearchId(prescription.data.id);
                      setFoundPrescription(prescription);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {prescription.data.patientName}
                        </h3>
                        <p className="text-xs text-gray-500">{prescription.data.medication}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        prescription.status === 'dispensed'
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {prescription.status === 'dispensed' ? '💊 Dispensada' : '✅ Lista'}
                      </span>
                    </div>

                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {prescription.issuerSignature.country}
                      </span>
                      {prescription.validatorSignature && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                          {prescription.validatorSignature.country}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
          <h3 className="font-semibold text-gray-900 mb-3">ℹ️ Sistema de Doble Firma</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="font-semibold text-blue-900 mb-1">1️⃣ Doctor Emisor</p>
              <p className="text-xs text-blue-700">
                Crea la receta en su país de origen y la firma con su identidad Semaphore
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="font-semibold text-purple-900 mb-1">2️⃣ Doctor Validador</p>
              <p className="text-xs text-purple-700">
                Valida la receta en el país destino y agrega su firma ZK
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="font-semibold text-green-900 mb-1">3️⃣ Farmacia</p>
              <p className="text-xs text-green-700">
                Verifica las dos firmas y dispensa el medicamento de forma segura
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
