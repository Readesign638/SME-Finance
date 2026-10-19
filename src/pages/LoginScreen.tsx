import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import {
  Mail, Lock, Building, ArrowRight, UserPlus, AlertCircle,
  Eye, EyeOff, KeyRound, ArrowLeft
} from 'lucide-react';

const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) navigate('/dashboard');
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          businessName: businessName,
          createdAt: new Date().toISOString(),
          role: 'merchant'
        });

        localStorage.setItem('khotsopay_business', businessName);
        localStorage.setItem('khotsopay_user_email', user.email || '');

        await auth.signOut();
        setMessage('Account created successfully! Please sign in.');
        setIsRegistering(false);
        setPassword('');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(
        'Password reset link sent. Check your inbox (and spam folder) for the email from Firebase.'
      );
      setIsResetting(false);
      setPassword('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Firebase returns vague messages for unknown emails — that's by design (security)
        // But we can improve UX for known error codes
        if (err.message.includes('user-not-found')) {
          setError('No account found with that email.');
        } else if (err.message.includes('invalid-email')) {
          setError('Enter a valid email address.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setError('');
    setMessage('');
    setPassword('');
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-6 bg-slate-900 font-sans">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2000&auto=format&fit=crop')` }}
      />

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-3">
              <img src="/logo.svg" alt="SME Finance" className="h-14 w-14 rounded-2xl shadow-md" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">SME Finance</h1>
            <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-widest">
              {isResetting ? 'Reset Password' : isRegistering ? 'Create Account' : 'Merchant Login'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm font-semibold">
              <AlertCircle size={16} className="flex-shrink-0" /> <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-5 p-3 bg-emerald-50 text-emerald-700 rounded-xl flex items-center gap-2 text-sm font-semibold">
              <span>{message}</span>
            </div>
          )}

          {/* Reset password view */}
          {isResetting && (
            <form onSubmit={handlePasswordReset} className="space-y-5">
              <div className="text-sm text-slate-600 mb-4">
                Enter the email you signed up with. We'll send you a link to reset your password.
              </div>

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-600 transition-colors" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-purple-600/20 focus:ring-4 focus:ring-purple-600/5 font-medium transition-all"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold text-base py-4 rounded-2xl hover:bg-purple-700 disabled:bg-purple-300 shadow-lg shadow-purple-500/30 transition-all active:scale-[0.98]"
              >
                {loading ? 'Sending…' : <><KeyRound size={18} /> Send Reset Link</>}
              </button>

              <button
                type="button"
                onClick={() => { setIsResetting(false); resetAll(); }}
                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-slate-400 hover:text-purple-600 transition-colors"
              >
                <ArrowLeft size={14} /> Back to login
              </button>
            </form>
          )}

          {/* Login / Register view */}
          {!isResetting && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegistering && (
                  <div className="relative group">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-600 transition-colors" size={20} />
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Business Name"
                      required={isRegistering}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-purple-600/20 focus:ring-4 focus:ring-purple-600/5 font-medium transition-all"
                    />
                  </div>
                )}

                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-600 transition-colors" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-purple-600/20 focus:ring-4 focus:ring-purple-600/5 font-medium transition-all"
                    required
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-600 transition-colors" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (at least 6 characters)"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-purple-600/20 focus:ring-4 focus:ring-purple-600/5 font-medium transition-all"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-purple-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {!isRegistering && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setIsResetting(true); resetAll(); }}
                      className="text-xs font-bold text-slate-400 hover:text-purple-600 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold text-base py-4 rounded-2xl hover:bg-purple-700 disabled:bg-purple-300 shadow-lg shadow-purple-500/30 transition-all active:scale-[0.98]"
                >
                  {loading
                    ? 'Please wait…'
                    : isRegistering
                    ? <><UserPlus size={18} /> Register</>
                    : <>Sign In <ArrowRight size={18} /></>}
                </button>
              </form>

              <button
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); resetAll(); }}
                className="w-full mt-6 text-sm font-bold text-slate-400 hover:text-purple-600 transition-colors"
              >
                {isRegistering ? 'Back to Login' : 'New merchant? Register Business'}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-6">
          Khotso-Pay · Merchant Suite
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;