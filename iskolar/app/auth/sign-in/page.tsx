"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const { data, error: signInError } = await (await import('@/lib/supabaseClient')).supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message || "Sign in failed");
      } else if (data.session) {
        // Save auth token in localStorage or sessionStorage depending on "remember me" setting
        const token = data.session.access_token;
        
        if (remember) {
          // For persistent login across browser sessions
          localStorage.setItem('authToken', token);
          
          // Also set a cookie with a 30-day expiration
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + 30);
          document.cookie = `authToken=${token}; path=/; expires=${expirationDate.toUTCString()}; SameSite=Strict`;
        } else {
          // For current browser session only
          sessionStorage.setItem('authToken', token);
          
          // Also set a session cookie (expires when browser closes)
          document.cookie = `authToken=${token}; path=/; SameSite=Strict`;
        }
        
        setSuccess("Sign in successful!");
        // Redirect to scholar announcements page
        router.push("/scholar/announcements");
      } else {
        setError("No session returned");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Network error");
      }
    } finally {
      setLoading(false);
    }
  }
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#e3f0ff] via-[#f5f7fa] to-[#e3f0ff] py-8">
      {/* Card */}
  <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-1 text-gray-900">Welcome Back</h2>
        <p className="text-gray-500 mb-6">Sign in to your account</p>
  <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          {success && <div className="text-green-600 text-sm mb-2">{success}</div>}
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="#9ca3af" strokeWidth="2" d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z"/><path stroke="#9ca3af" strokeWidth="2" d="m4 7 8 6 8-6"/></svg>
              </span>
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="example@gmail.com"
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2196F3] focus:border-[#2196F3] bg-gray-50 text-gray-900 placeholder-gray-400"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><rect width="16" height="10" x="4" y="10" stroke="#9ca3af" strokeWidth="2" rx="2"/><path stroke="#9ca3af" strokeWidth="2" d="M8 10V7a4 4 0 1 1 8 0v3"/></svg>
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2196F3] focus:border-[#2196F3] bg-gray-50 text-gray-900 placeholder-gray-400"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 focus:outline-none"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  // Eye-off icon
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <path stroke="#9ca3af" strokeWidth="2" d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-6.5 0-10-8-10-8a17.6 17.6 0 0 1 3.07-4.36M6.12 6.12A9.98 9.98 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-4.07 5.36M1 1l22 22" />
                    <circle cx="12" cy="12" r="3" stroke="#9ca3af" strokeWidth="2" />
                  </svg>
                ) : (
                  // Eye icon
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" stroke="#9ca3af" strokeWidth="2" />
                    <path stroke="#9ca3af" strokeWidth="2" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {/* Remember me & Forgot password */}
          <div className="flex items-center justify-between mt-1 mb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <span className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="peer appearance-none w-4 h-4 border border-gray-300 rounded-md bg-white checked:bg-[#2196F3] checked:border-[#2196F3] focus:outline-none transition-all cursor-pointer"
                  style={{ outline: 'none' }}
                />
                <span className="pointer-events-none absolute left-0 top-0 w-4 h-4 flex items-center justify-center">
                  {remember && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
              </span>
              <span className="ml-1">Remember me</span>
            </label>
            <Link href="/auth/reset-password" className="text-sm text-[#FFC107] font-medium hover:underline">
              Forgot Password?
            </Link>
          </div>
          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer w-full py-2 rounded-lg bg-gradient-to-r from-[#D32F2F] to-[#B71C1C] text-white font-semibold text-lg shadow hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
  <div className="mt-4 text-sm text-gray-500">
          Don&#39;t have an account yet?{' '}
          <Link href="/auth/register" className="text-[#2196F3] font-semibold hover:underline">Register</Link>
        </div>
      </div>

      {/* Copyright */}
  <div className="mt-8 text-xs text-gray-400">© 2025 IskoLAR</div>
    </div>
  );
}
