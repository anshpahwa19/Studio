'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sparkles, Scissors, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@salon.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError('Invalid email or password. Please check and try again.');
        toast.error('Authentication failed');
      } else {
        toast.success('Welcome back!');
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
  };

  return (
    <div className="w-full max-w-md">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#A78BFA] text-white shadow-lg shadow-purple-500/25 mb-4 ring-4 ring-white">
          <Scissors className="w-7 h-7 transform -rotate-45" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center justify-center gap-2">
          <span>Shruti Pahwa</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-[#7C3AED] uppercase tracking-wider">
            Luxury Salon
          </span>
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Shruti Pahwa Luxury Salon & Academy Management
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xl shadow-stone-200/50 p-8 backdrop-blur-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-stone-900">Sign In</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Enter your credentials to access your salon workspace
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 flex items-start gap-2">
            <span className="font-semibold shrink-0">Error:</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@salon.com"
            required
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                Password
              </label>
              <span className="text-xs text-[#7C3AED] hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              leftIcon={<Lock className="w-4 h-4" />}
            />
          </div>

          <Button
            type="submit"
            loading={loading}
            className="w-full mt-2"
            size="lg"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In to Workspace
          </Button>
        </form>

        {/* Demo Credentials Quick-Fill */}
        <div className="mt-8 pt-6 border-t border-stone-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>Demo Accounts (1-Click Fill)</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@salon.com', 'admin123')}
              className="px-2.5 py-2 text-left bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors group"
            >
              <div className="text-[11px] font-semibold text-stone-800 group-hover:text-[#7C3AED]">
                Owner
              </div>
              <div className="text-[10px] text-stone-500">Full Access</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('manager@salon.com', 'manager123')}
              className="px-2.5 py-2 text-left bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors group"
            >
              <div className="text-[11px] font-semibold text-stone-800 group-hover:text-[#7C3AED]">
                Manager
              </div>
              <div className="text-[10px] text-stone-500">Operations</div>
            </button>
            <button
              type="button"
              onClick={() =>
                handleQuickLogin('reception@salon.com', 'reception123')
              }
              className="px-2.5 py-2 text-left bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors group"
            >
              <div className="text-[11px] font-semibold text-stone-800 group-hover:text-[#7C3AED]">
                Reception
              </div>
              <div className="text-[10px] text-stone-500">Bookings/POS</div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-6 text-xs text-stone-400 flex items-center justify-center gap-1">
        <Sparkles className="w-3 h-3 text-[#7C3AED]" />
        <span>Enterprise Salon & Nail Spa Operating System</span>
      </div>
    </div>
  );
}
