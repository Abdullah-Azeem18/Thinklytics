"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2, BrainCircuit, Lock, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";


export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  
  // Auth Modes: "main" | "forgot_password"
  const [authMode, setAuthMode] = useState<"main" | "forgot_password">("main");
  const [isLogin, setIsLogin] = useState(true);
  
  // Forgot Password Steps: "email" | "otp" | "new_password"
  const [resetStep, setResetStep] = useState<"email" | "otp" | "new_password">("email");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otp, setOtp] = useState(""); 
  const [showOtpInput, setShowOtpInput] = useState(false); // For Registration OTP
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  // 1. Google Login
  const handleGoogleLogin = async () => {
    setLoading("google");
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` }
    });
    if (error) setMessage({ type: "error", text: error.message });
    setLoading(null);
  };

  // 2. Manual Email & Password Auth (Register / Login)
  const handleManualAuth = async () => {
    if (!email || !password) {
      setMessage({ type: "error", text: "Please enter both email and password." });
      return;
    }
    setLoading("manual");
    setMessage(null);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setShowOtpInput(true);
          setMessage({ type: "error", text: "Email not verified. Please check your email for the OTP code." });
        } else {
          setMessage({ type: "error", text: error.message });
        }
      } else {
        router.push('/');
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        if (data.user?.identities?.length === 0) {
          setMessage({ type: "error", text: "This email is already registered. Please log in." });
        } else {
          setShowOtpInput(true);
          setMessage({ type: "success", text: "We've sent a 6-digit code to your email. Please enter it below." });
        }
      }
    }
    setLoading(null);
  };

  // 3. Verify OTP for Signup
  const handleVerifySignupOtp = async () => {
    if (!otp) return;
    setLoading("otp");
    setMessage(null);

    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "signup" });

    if (error) {
      setMessage({ type: "error", text: "Invalid or expired OTP. Please try again." });
    } else {
      setMessage({ type: "success", text: "Email verified! You can now log in." });
      setShowOtpInput(false);
      setIsLogin(true);
      setPassword(""); 
    }
    setLoading(null);
  };

  // 4. FORGOT PASSWORD FLOW
  const handleSendResetCode = async () => {
    if (!email) {
      setMessage({ type: "error", text: "Please enter your email address first." });
      return;
    }
    setLoading("reset_email");
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "A 6-digit reset code has been sent to your email." });
      setResetStep("otp");
    }
    setLoading(null);
  };

  const handleVerifyResetOtp = async () => {
    if (!otp) return;
    setLoading("reset_otp");
    setMessage(null);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "recovery" });
    if (error) {
      setMessage({ type: "error", text: "Invalid or expired code. Please try again." });
    } else {
      setMessage({ type: "success", text: "Code verified! Please set your new password." });
      setResetStep("new_password");
    }
    setLoading(null);
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    setLoading("update_password");
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Password updated successfully! You can now log in." });
      setAuthMode("main");
      setIsLogin(true);
      setPassword("");
      setNewPassword("");
      setOtp("");
    }
    setLoading(null);
  };

  // 5. Back Handlers
  const handleBackToLogin = () => {
    setMessage(null);
    setEmail("");
    setPassword("");
    setOtp("");
    setNewPassword("");
    setShowOtpInput(false);
    setAuthMode("main");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex bg-slate-950 p-3 rounded-2xl border border-slate-800 mb-4 shadow-inner">
            <BrainCircuit className="text-emerald-400" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Thinklytics</h1>
          <p className="text-slate-400 mt-2">
            {authMode === "forgot_password" ? "Reset your password."
              : (showOtpInput ? "Verify your email address." 
              : (isLogin ? "Welcome back! Log in to your account." : "Create a new account to get started."))}
          </p>
        </div>

        {message && (
          <div className={`p-3 rounded-xl mb-6 text-sm text-center relative z-10 ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
            {message.text}
          </div>
        )}

        {authMode === "forgot_password" ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 relative z-10">
            {resetStep === "email" && (
              <>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                  <input type="email" placeholder="Enter your registered email" className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <button onClick={handleSendResetCode} disabled={!!loading || !email} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold py-3 mt-2 rounded-xl flex justify-center items-center transition-colors cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-blue-500/20">
                  {loading === "reset_email" ? <Loader2 className="animate-spin" size={20} /> : "Send Reset Code"}
                </button>
              </>
            )}

            {resetStep === "otp" && (
              <>
                <input type="text" placeholder="Enter 6-digit code" maxLength={6} className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-4 focus:ring-2 focus:ring-blue-500 outline-none text-center tracking-[0.3em] font-mono text-xl" value={otp} onChange={(e) => setOtp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleVerifyResetOtp()} />
                <button onClick={handleVerifyResetOtp} disabled={!!loading || otp.length < 6} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold py-3 mt-2 rounded-xl flex justify-center items-center transition-colors cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20">
                  {loading === "reset_otp" ? <Loader2 className="animate-spin" size={20} /> : "Verify Code"}
                </button>
              </>
            )}

            {resetStep === "new_password" && (
              <>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                  <input type="password" placeholder="Enter new password" className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUpdatePassword()} />
                </div>
                <button onClick={handleUpdatePassword} disabled={!!loading || newPassword.length < 6} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold py-3 mt-2 rounded-xl flex justify-center items-center transition-colors cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-blue-500/20">
                  {loading === "update_password" ? <Loader2 className="animate-spin" size={20} /> : "Update Password"}
                </button>
              </>
            )}

            <div className="border-t border-slate-800 my-4"></div>
            <button onClick={() => { setAuthMode("main"); setResetStep("email"); setMessage(null); setOtp(""); }} className="w-full flex items-center justify-center space-x-2 text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors cursor-pointer">
              <ArrowLeft size={16} /> <span>Back to login</span>
            </button>
          </div>
          
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 relative z-10">
            {!showOtpInput ? (
              <>
                {/* 1. Email & Password Inputs */}
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                  <input type="email" placeholder="Email Address" className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    <input type="password" placeholder="Password (min 6 characters)" className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleManualAuth()} />
                  </div>
                  {isLogin && (
                    <div className="flex justify-end mt-2">
                      <button onClick={() => { setAuthMode("forgot_password"); setResetStep("email"); setMessage(null); }} className="text-xs text-blue-500 hover:text-blue-400 transition-colors cursor-pointer font-medium">
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>
                
                {/* 2. Login/Signup Button */}
                <button onClick={handleManualAuth} disabled={!!loading || !email || !password} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold py-3 mt-2 rounded-xl flex justify-center items-center transition-colors cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-blue-500/20">
                  {loading === "manual" ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? "Log In" : "Create Account")}
                </button>
                <div className="text-center mt-4">
                  <button onClick={() => { setIsLogin(!isLogin); setMessage(null); }} className="text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                  </button>
                </div>

                {/* 3. OR Divider */}
                <div className="flex items-center space-x-4 my-6">
                  <div className="flex-1 h-px bg-slate-800"></div>
                  <span className="text-slate-500 text-sm font-medium">OR</span>
                  <div className="flex-1 h-px bg-slate-800"></div>
                </div>

                {/* 4. Google Login Button */}
                <button onClick={handleGoogleLogin} disabled={!!loading} className="w-full flex items-center justify-center space-x-3 bg-slate-100 hover:bg-white text-slate-900 font-semibold py-3 px-4 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed">
                  {loading === "google" ? <Loader2 className="animate-spin" size={20} /> : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                  )}
                  <span>Continue with Google</span>
                </button>
              </>
            ) : (
              <>
                <input type="text" placeholder="Enter 6-digit OTP" maxLength={6} className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-4 focus:ring-2 focus:ring-blue-500 outline-none text-center tracking-[0.3em] font-mono text-xl" value={otp} onChange={(e) => setOtp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleVerifySignupOtp()} />
                
                <button onClick={handleVerifySignupOtp} disabled={!!loading || otp.length < 6} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold py-3 mt-2 rounded-xl flex justify-center items-center transition-colors cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20">
                  {loading === "otp" ? <Loader2 className="animate-spin" size={20} /> : "Verify & Continue"}
                </button>
                <div className="text-center mt-4">
                  <button onClick={() => setShowOtpInput(false)} className="text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">
                    Change email address
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}