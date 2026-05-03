"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { LogOut, Zap, CreditCard, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";



export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }
      
      setUser(user);

      // Fetch profile data from database
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      } else {
        // Fallback agar profile table mein row nahi milti
        setProfile({ plan: 'free', credits_used: 0 });
      }
      
      setLoading(false);
    };
    
    fetchUserAndProfile();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  const avatarUrl = user?.user_metadata?.avatar_url;
  const email = user?.email || "";
  const initial = email ? email.charAt(0).toUpperCase() : "?";

  // Dynamic Plan & Credits Logic
  const currentPlan = profile?.plan?.toLowerCase() || "free";
  const displayPlanName = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1) + " Plan";
  
  // Plan ke hisaab se limits set karein (Aap isko apni marzi se change kar sakte hain)
  const maxCredits = currentPlan === "ultra" ? 1000 : currentPlan === "pro" ? 500 : 50;
  // Database se credits_used uthayein (agar column nahi hai toh 0 dikhayega)
  const creditsUsed = profile?.credits_used || 0; 
  const progressPercentage = Math.min((creditsUsed / maxCredits) * 100, 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} className="mr-2" /> Back to Home
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">My Account</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: User Profile Info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="md:col-span-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-blue-600/20 to-transparent"></div>
              
              <div className="relative inline-block mt-4 mb-4">
                {avatarUrl && !imageError ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile" 
                    onError={() => setImageError(true)}
                    className="w-24 h-24 rounded-full border-4 border-slate-800 object-cover relative z-10" 
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-slate-800 bg-blue-600 flex items-center justify-center text-4xl font-bold text-white relative z-10 shadow-lg shadow-blue-500/30">
                    {initial}
                  </div>
                )}
              </div>

              <h2 className="text-lg font-semibold truncate px-2">{email}</h2>
              <p className="text-slate-400 text-sm mt-1">
                Joined {new Date(user?.created_at).toLocaleDateString()}
              </p>

              <div className="border-t border-slate-800 my-6"></div>

              <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 rounded-xl transition-colors font-medium border border-red-500/20 cursor-pointer">
                <LogOut size={18} /> <span>Log Out</span>
              </button>
            </div>
          </motion.div>

          {/* Right Column: Plan & Credits Info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="md:col-span-2 space-y-6">
            
            {/* Current Plan Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-lg flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`p-2 rounded-lg ${currentPlan === 'free' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    <Zap size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">{displayPlanName}</h3>
                </div>
                <p className="text-slate-400 text-sm">
                  {currentPlan === 'free' 
                    ? "You are currently on the basic free tier." 
                    : `Enjoy your premium ${currentPlan} benefits.`}
                </p>
              </div>
              <Link href="/pricing" className="bg-slate-100 hover:bg-white text-slate-900 px-5 py-2.5 rounded-xl font-medium transition-colors cursor-pointer">
                {currentPlan === 'free' ? 'Upgrade' : 'Manage Plan'}
              </Link>
            </div>

            {/* Credits Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-lg">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                  <CreditCard size={20} />
                </div>
                <h3 className="text-xl font-bold text-white">Credits Remaining</h3>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Generations used</span>
                  <span className="font-medium text-white">{creditsUsed} / {maxCredits}</span>
                </div>
                {/* Dynamic Progress Bar */}
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full rounded-full ${progressPercentage > 90 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`} 
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
              
              <p className="text-slate-500 text-sm">Your credits will reset on the 1st of next month.</p>
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}