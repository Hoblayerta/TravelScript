'use client'

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'

export default function Home() {
  const { address, isConnected } = useAppKitAccount()
  const { open } = useAppKit()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🏥 TravelScript
          </h1>
          <p className="text-lg text-gray-600">
            Global Medical Prescription Platform
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Powered by Flare Network
          </p>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">
            ⚕️ Dual-Doctor Verification System
          </h2>
          <p className="text-blue-700 text-sm">
            Doctor 1 creates prescription → Doctor 2 validates → Pharmacy dispenses
          </p>
        </div>

        {!isConnected ? (
          <div className="text-center">
            <appkit-button />
            <p className="text-sm text-gray-500 mt-4">
              Connect with Email, Google, GitHub, Discord or Wallet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-semibold mb-2">
                ✅ Connected to Flare Coston2
              </p>
              <p className="text-green-700 text-sm font-mono break-all">
                {address}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/doctor"
                className="bg-blue-600 text-white text-center py-4 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                👨‍⚕️ Doctor Portal
              </a>
              <a
                href="/doctor/validate"
                className="bg-purple-600 text-white text-center py-4 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                🔐 Validar Recetas
              </a>
            </div>

            <a
              href="/pharmacy"
              className="block w-full bg-green-600 text-white text-center py-4 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              💊 Pharmacy Portal
            </a>

            <button
              onClick={() => open()}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition"
            >
              Account Settings
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">
            🔒 Privacy & Security
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>✓ Zero-knowledge proofs protect doctor identity</li>
            <li>✓ Flare FDC attestation ensures data integrity</li>
            <li>✓ Gasless transactions for better UX</li>
            <li>✓ International prescription verification</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
