'use client';

import { useState } from 'react';

export default function ForgotPasswordPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${process.env['NEXT_PUBLIC_BACKEND_URL'] ?? 'http://localhost:3001'}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok && res.status !== 204) {
        setError('Une erreur est survenue. Veuillez réessayer.');
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Mot de passe oublié
          </h1>

          {submitted ? (
            <div className="mt-4">
              <p className="text-sm text-gray-700 text-center">
                Si cette adresse est associée à un compte, vous recevrez un email avec un lien de réinitialisation dans quelques minutes.
              </p>
              <div className="mt-6 text-center">
                <a href="/login" className="text-sm text-blue-600 hover:underline">
                  Retour à la connexion
                </a>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 text-center mb-6">
                Saisissez votre adresse email pour recevoir un lien de réinitialisation.
              </p>

              <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="vous@exemple.fr"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Envoi…' : 'Envoyer le lien'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <a href="/login" className="text-sm text-blue-600 hover:underline">
                  Retour à la connexion
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
