import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';
import { authenticateUser } from '../utils/authService';
import { AuthUser } from '../types';

interface AdminAuthGateProps {
  onAuthenticated: (user: AuthUser) => void;
  onCancel: () => void;
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({
  onAuthenticated,
  onCancel,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [passkey, setPasskey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim() || !passkey.trim()) {
      setErrorMessage('Please provide your work email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authenticateUser(identifier, passkey);
      if (result.success && result.user) onAuthenticated(result.user);
      else setErrorMessage(result.error || 'Sign-in failed. Please verify your credentials.');
    } finally { setIsSubmitting(false); }
  };


  return (
    <div className="w-full max-w-lg mx-auto my-8 sm:my-12">
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-slate-900 px-6 py-6 text-white text-center relative">
          <button
            onClick={onCancel}
            className="absolute left-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Return to Visitor Portal"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>

          <h2 className="text-lg font-bold text-white tracking-tight">
            Staff & driver sign in
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Use your organization-issued staff or driver account to continue.
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-emerald-400 font-mono mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>STAFF / DRIVER ACCOUNT SIGN-IN</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Personnel Identifier */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Work email address
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  disabled={isSubmitting}
                  placeholder="name@company.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono disabled:bg-slate-100 transition-all"
                />
              </div>
            </div>

            {/* Passkey */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isSubmitting}
                  placeholder="Enter your password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono disabled:bg-slate-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign in securely</span>
                </>
              )}
            </button>
          </form>

          <div className="border-t border-slate-100 pt-4 text-center text-xs leading-5 text-slate-500">
            Staff accounts must be provisioned by an authorized administrator. Demo credentials are disabled.
          </div>

          {/* Security Compliance Footnote */}
          <div className="pt-2 text-center">
            <p className="text-[10px] text-slate-400 leading-normal">
              Access is verified by the Apex backend. Activity auditing depends on the configured server environment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
