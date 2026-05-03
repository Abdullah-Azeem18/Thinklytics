"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, ArrowLeft, Zap, Crown, Building2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";



const pricingPlans = [
  {
    id: "free",
    name: "Free",
    icon: <Zap className="text-slate-400 mb-4" size={32} />,
    price: "$0",
    description: "Perfect for testing the waters and casual use.",
    features: [
      { name: "3 Summaries per day", included: true },
      { name: "Up to 5MB PDF size", included: true },
      { name: "Standard AI Models", included: true },
      { name: "Basic Chat Interface", included: true },
      { name: "Chat History Saving", included: true },
      { name: "YouTube Playlist Analysis", included: false },
    ],
    buttonText: "Get Started Free",
    buttonStyle: "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700",
    isPopular: false,
    priceId: null,
  },
  {
    id: "pro",
    name: "Pro",
    icon: <Crown className="text-blue-400 mb-4" size={32} />,
    price: "$12",
    period: "/month",
    description: "Ideal for students, researchers, and professionals.",
    features: [
      { name: "Unlimited Summaries", included: true },
      { name: "Up to 50MB PDF size", included: true },
      { name: "Faster AI Processing", included: true },
      { name: "Advanced Chat & Insights", included: true },
      { name: "Save Unlimited Chat History", included: true },
      { name: "YouTube Playlist Analysis", included: false },
    ],
    buttonText: "Upgrade to Pro",
    buttonStyle: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25",
    isPopular: true,
    priceId: "price_YOUR_PRO_PRICE_ID",
  },
  {
    id: "ultra",
    name: "Ultra",
    icon: <Building2 className="text-emerald-400 mb-4" size={32} />,
    price: "$29",
    period: "/month",
    description: "For heavy data users and small businesses.",
    features: [
      { name: "Unlimited Summaries", included: true },
      { name: "Up to 100MB+ PDF size", included: true },
      { name: "Priority AI Processing", included: true },
      { name: "Export Insights (PDF/Word)", included: true },
      { name: "Save Unlimited Chat History", included: true },
      { name: "YouTube Playlist Analysis", included: true },
    ],
    buttonText: "Get Ultra",
    buttonStyle: "bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-900/50",
    isPopular: false,
    priceId: "price_YOUR_ULTRA_PRICE_ID",
  }
];

export default function PricingPage() {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (priceId: string | null, planId: string) => {
    // 🔥 Yahan update kiya gaya hai: "/" ki jagah "/login"
    if (planId === "free" || !priceId) {
      router.push("/login");
      return;
    }

    setLoadingPlan(planId);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      alert("Please login first to upgrade your plan!");
      router.push("/login");
      return;
    }

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: priceId,
          userId: session.user.id,
          userEmail: session.user.email,
          planName: planId
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to create checkout session: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again.");
    }

    setLoadingPlan(null);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30">

      <nav className="w-full border-b border-slate-800/50 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Home</span>
        </Link>
        <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          Thinklytics
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pb-24">

        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6"
          >
            Simple, transparent pricing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-400"
          >
            Choose the plan that fits your needs. No hidden fees, cancel anytime.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              whileHover={{
                y: -12,
                scale: 1.02,
                transition: { duration: 0.2, ease: "easeOut" }
              }}
              className={`relative bg-slate-900 rounded-3xl p-8 flex flex-col h-full border cursor-default transition-shadow duration-300 ${plan.isPopular
                  ? 'border-blue-500 shadow-2xl shadow-blue-900/20 hover:shadow-blue-500/20'
                  : 'border-slate-800 shadow-xl hover:border-slate-700 hover:shadow-emerald-500/5'
                }`}
            >
              {plan.isPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-blue-400 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg z-10">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                {plan.icon}
                <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                <p className="text-sm text-slate-400 mt-2 min-h-[40px]">{plan.description}</p>
              </div>

              <div className="mb-6 flex items-baseline text-white">
                <span className="text-5xl font-extrabold tracking-tight">{plan.price}</span>
                {plan.period && <span className="text-lg text-slate-400 ml-1">{plan.period}</span>}
              </div>

              <button
                onClick={() => handleUpgrade(plan.priceId, plan.id)}
                disabled={loadingPlan === plan.id}
                className={`w-full py-3.5 px-4 rounded-xl font-semibold transition-all mb-8 flex justify-center items-center group ${plan.buttonStyle} ${loadingPlan === plan.id ? "opacity-75 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {loadingPlan === plan.id ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                {loadingPlan === plan.id ? "Processing..." : plan.buttonText}
              </button>

              <div className="flex-1 space-y-4">
                <p className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Features included:</p>
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start space-x-3">
                    {feature.included ? (
                      <Check size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <X size={20} className="text-slate-600 shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${feature.included ? 'text-slate-300' : 'text-slate-500'}`}>
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

      </main>
    </div>
  );
}