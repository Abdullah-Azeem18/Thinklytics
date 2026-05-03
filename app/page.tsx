"use client";

import { useState, useEffect } from "react";
import { FileText, Link as LinkIcon, Video, Send, UploadCloud, Loader2, Sparkles, Bot, BrainCircuit, Plus, PanelLeftClose, PanelLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store/useStore";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// Base API URL for Production and Localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Chat History Type
type SavedChat = {
  id: string;
  title: string;
  type: "pdf" | "youtube" | "url";
  summary: string;
  messages: { role: string; content: string }[];
  created_at: string;
};

// --- Custom Formatter for Summary & Key Insights ---
const formatSummaryText = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    // 1. Detect Headings
    const headingMatch = line.match(/^\*\*(.*?)\*\*:?$/) || line.match(/^(SUMMARY|KEY INSIGHTS):?$/i);
    if (headingMatch) {
      const title = (headingMatch[1] || headingMatch[0]).replace(/:/g, '').replace(/\*\*/g, '').trim();
      elements.push(
        <div key={`h-${index}`} className="mt-8 mb-4 first:mt-0 flex items-center">
          <div className="bg-slate-800/80 border border-slate-700 px-4 py-1.5 rounded-full flex items-center space-x-2 shadow-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
            <span className="text-emerald-300 font-bold text-xs tracking-widest uppercase">
              {title}
            </span>
          </div>
        </div>
      );
      return;
    }

    // 2. Detect Bullet Points
    const bulletMatch = line.match(/^[\*\-]\s+(.*)$/);
    if (bulletMatch) {
      const content = bulletMatch[1];
      const parts = content.split(/(\*\*.*?\*\*)/g);
      elements.push(
        <div key={`li-${index}`} className="flex items-start space-x-3 mb-3 ml-1 group">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500/80 mt-2.5 shrink-0 group-hover:bg-emerald-400 transition-colors"></div>
          <p className="text-slate-300 leading-relaxed text-[15px] flex-1">
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-slate-100 font-semibold">{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        </div>
      );
      return;
    }

    if (line.trim() === '') return;

    // 3. Normal Paragraphs
    const parts = line.split(/(\*\*.*?\*\*)/g);
    elements.push(
      <p key={`p-${index}`} className="mb-4 text-slate-300 leading-relaxed text-[15px]">
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="text-slate-100 font-semibold">{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </p>
    );
  });

  return elements;
};

export default function Home() {
  const router = useRouter();
  const { activeTab, setActiveTab, isProcessing, setProcessing, userPlan, setUserPlan } = useStore();
  
  const [inputValue, setInputValue] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{type: string, text: string} | null>(null);
  
  // App States
  const [summaryData, setSummaryData] = useState<string | null>(null);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatting, setIsChatting] = useState(false);

  // Sidebar & History States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatHistory, setChatHistory] = useState<SavedChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Auth State
  const [user, setUser] = useState<any>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const checkUserAndFetchChats = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        // Fetch User Plan from profiles table
        const { data: profileData } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", session.user.id)
          .single();
          
        if (profileData) {
          setUserPlan(profileData.plan as 'free' | 'pro' | 'ultra');
        }

        // UPDATE: Ab free plan walo ki history bhi fetch hogi
        fetchChatHistory(session.user.id);
      } else {
        setUser(null);
      }
    };
    checkUserAndFetchChats();
  }, [setUserPlan]);

  const fetchChatHistory = async (userId: string) => {
    const { data, error } = await supabase
      .from("chat_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setChatHistory(data);
    }
  };

  const checkDailyLimit = async (userId: string) => {
    // Pro and Ultra users have unlimited access
    if (userPlan === 'pro' || userPlan === 'ultra') return true;

    // Free users are restricted to 3 per day
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
      .from("chat_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", `${today}T00:00:00Z`);

    if (error) return true; // Fail safe
    return (count || 0) < 3;
  };

  const startNewChat = () => {
    setSummaryData(null);
    setMessages([]);
    setInputValue("");
    setStatusMessage(null);
    setCurrentChatId(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const loadChat = (chat: SavedChat) => {
    setSummaryData(chat.summary);
    setMessages(chat.messages || []);
    setCurrentChatId(chat.id);
    setActiveTab(chat.type);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const resetUI = () => {
    setProcessing(true);
    setStatusMessage(null);
    setSummaryData(null);
    setMessages([{ role: "assistant", content: "I have analyzed the document. What would you like to ask about it?" }]);
  };

  // UPDATE: userPlan === 'free' restriction removed
  const saveNewChatToDB = async (title: string, type: string, summary: string) => {
    if (!user) return null; 
    
    const initialMessages = [{ role: "assistant", content: "I have analyzed the document. What would you like to ask about it?" }];
    
    const { data, error } = await supabase
      .from("chat_history")
      .insert({
        user_id: user.id,
        title: title,
        type: type,
        summary: summary,
        messages: initialMessages
      })
      .select()
      .single();

    if (!error && data) {
      setChatHistory([data, ...chatHistory]);
      setCurrentChatId(data.id);
      return data.id;
    }
    return null;
  };

  // UPDATE: userPlan === 'free' restriction removed
  const updateChatMessagesInDB = async (chatId: string, newMessages: any[]) => {
    if (!user || !chatId) return; 
    
    setChatHistory(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, messages: newMessages } : chat
    ));

    await supabase
      .from("chat_history")
      .update({ messages: newMessages })
      .eq("id", chatId);
  };

  const handleAnalyze = async () => {
    if (!inputValue && activeTab !== "pdf") return;
    if (!user) { router.push('/pricing'); return; }

    // Check Limit Before Processing
    const canProcess = await checkDailyLimit(user.id);
    if (!canProcess) {
      setStatusMessage({ type: 'error', text: "Daily limit reached (3/3). Please upgrade to Pro for unlimited summaries." });
      return;
    }

    resetUI();
    const isYoutube = activeTab === "youtube";
    const apiEndpoint = isYoutube 
      ? `${API_BASE_URL}/api/process-youtube` 
      : `${API_BASE_URL}/api/process-url`;

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputValue })
      });

      if (response.ok) {
        const data = await response.json();
        setStatusMessage({ type: 'success', text: isYoutube ? "Video processed successfully!" : "Article processed successfully!" });
        setSummaryData(data.summary_data);
        
        await saveNewChatToDB(
          isYoutube ? "YouTube Video Analysis" : "Web Article Analysis", 
          isYoutube ? "youtube" : "url", 
          data.summary_data
        );
        setInputValue(""); 

      } else {
        const errorData = await response.json();
        setStatusMessage({ type: 'error', text: errorData.detail || "Failed to process link." });
      }
    } catch (error) {
      setStatusMessage({ type: 'error', text: "Failed to connect to the backend server." });
    }
    setProcessing(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!user) { router.push('/pricing'); event.target.value = ''; return; }

    // File Size Restriction Logic
    let MAX_FILE_SIZE = 5 * 1024 * 1024; // Free: 5MB
    if (userPlan === 'pro') MAX_FILE_SIZE = 50 * 1024 * 1024; // Pro: 50MB
    if (userPlan === 'ultra') MAX_FILE_SIZE = 100 * 1024 * 1024; // Ultra: 100MB

    if (file.size > MAX_FILE_SIZE) {
      setStatusMessage({ type: 'error', text: `File is too large! Your ${userPlan.toUpperCase()} plan supports up to ${MAX_FILE_SIZE / (1024*1024)}MB.` });
      event.target.value = ''; // Reset input
      return;
    }

    // Check Limit Before Processing
    const canProcess = await checkDailyLimit(user.id);
    if (!canProcess) {
      setStatusMessage({ type: 'error', text: "Daily limit reached (3/3). Please upgrade to Pro for unlimited access." });
      event.target.value = '';
      return;
    }

    resetUI();
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/process-pdf`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setStatusMessage({ type: 'success', text: "PDF processed successfully!" });
        setSummaryData(data.summary_data);

        await saveNewChatToDB(file.name, "pdf", data.summary_data);

      } else {
        const errorData = await response.json();
        setStatusMessage({ type: 'error', text: errorData.detail || "Failed to process PDF." });
      }
    } catch (error) {
      setStatusMessage({ type: 'error', text: "Failed to connect to the backend server." });
    }
    setProcessing(false);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !currentChatId) return;
    
    const userMessage = chatInput;
    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setChatInput("");
    setIsChatting(true);

    await updateChatMessagesInDB(currentChatId, newMessages);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMessage })
      });

      let aiResponse = "Sorry, a backend error occurred.";
      if (response.ok) {
        const data = await response.json();
        aiResponse = data.answer;
      }
      
      const finalMessages = [...newMessages, { role: "assistant", content: aiResponse }];
      setMessages(finalMessages);
      
      await updateChatMessagesInDB(currentChatId, finalMessages);

    } catch (error) {
      const finalMessages = [...newMessages, { role: "assistant", content: "Network error. Please check the server status." }];
      setMessages(finalMessages);
      await updateChatMessagesInDB(currentChatId, finalMessages);
    }
    setIsChatting(false);
  };

  const avatarUrl = user?.user_metadata?.avatar_url;
  const initial = user?.email ? user.email.charAt(0).toUpperCase() : "?";

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans">
      
      {/* --- SIDEBAR --- */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-40 absolute md:relative"
          >
            {/* Sidebar Header */}
            <div className="p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <BrainCircuit className="text-emerald-400" size={24} />
                <span className="text-lg font-bold text-white tracking-tight">Thinklytics</span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)} 
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
                title="Close Sidebar"
              >
                <PanelLeftClose size={20} />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-4">
              <button 
                onClick={startNewChat}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                <Plus size={18} /> <span>New Analysis</span>
              </button>
            </div>

            {/* Chat History List */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 custom-scrollbar pb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Recent Sessions</p>
              {!user ? (
                <p className="text-sm text-slate-500 text-center mt-4 italic">Login to save history.</p>
              ) : chatHistory.length === 0 ? (
                <p className="text-sm text-slate-500 text-center mt-4 italic">No history yet.</p>
              ) : (
                chatHistory.map((chat) => (
                  <button 
                    key={chat.id}
                    onClick={() => loadChat(chat)}
                    className={`w-full flex items-start space-x-3 text-left p-3 rounded-xl transition-colors cursor-pointer ${currentChatId === chat.id ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/50 border border-transparent'}`}
                  >
                    <div className="mt-0.5 text-slate-400">
                      {chat.type === 'pdf' ? <FileText size={16} /> : chat.type === 'youtube' ? <Video size={16} /> : <LinkIcon size={16} />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-sm font-medium text-slate-200 truncate">{chat.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{new Date(chat.created_at).toLocaleDateString()}</p>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Sidebar Footer */}
            {user && (
              <div className="p-4 border-t border-slate-800 bg-slate-900">
                <Link href="/profile" className="flex items-center space-x-3 hover:bg-slate-800 p-2 rounded-xl transition-colors border border-transparent hover:border-slate-700">
                  {avatarUrl && !imageError ? (
                    <img src={avatarUrl} onError={() => setImageError(true)} alt="Profile" className="w-8 h-8 rounded-full border border-slate-700 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">{initial}</div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{user.email}</p>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <p className="text-xs text-slate-400">View Profile</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${userPlan === 'ultra' ? 'bg-emerald-500/20 text-emerald-400' : userPlan === 'pro' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-300'}`}>
                        {userPlan}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        
        {/* Header / Navbar */}
        <nav className="w-full border-b border-slate-800/50 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-30 px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Open Sidebar"
              >
                <PanelLeft size={24} />
              </button>
            )}
            {!isSidebarOpen && (
               <div className="flex items-center space-x-2 font-bold text-white">
                 <BrainCircuit className="text-emerald-400" size={24} />
                 <span className="hidden sm:inline">Thinklytics</span>
               </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {!user ? (
              <>
                <button onClick={() => router.push('/login')} className="text-slate-400 hover:text-white font-medium transition-colors text-sm cursor-pointer">Login</button>
                <button onClick={() => router.push('/pricing')} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg cursor-pointer">Get Started</button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/profile" className="flex items-center space-x-2 hover:bg-slate-800 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-slate-700">
                  {avatarUrl && !imageError ? (
                    <img src={avatarUrl} onError={() => setImageError(true)} alt="Profile" className="w-8 h-8 rounded-full border border-slate-700 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">{initial}</div>
                  )}
                  <span className="text-sm font-medium text-slate-300 hidden sm:block max-w-[150px] truncate">{user.email}</span>
                </Link>
                
                <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors border border-slate-700 cursor-pointer">
                  Logout
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
          
          {/* Main Input Area - Fixed Spacing */}
          <div className="w-full max-w-4xl mx-auto pt-8 md:pt-10 pb-6 px-4 md:px-6">
            
            {/* Centered Logo & Brand Name */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 flex flex-col items-center">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl mb-5 shadow-xl shadow-emerald-500/5">
                <BrainCircuit className="text-emerald-400" size={48} strokeWidth={1.5} />
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-4 tracking-tight">
                Thinklytics
              </h1>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Upload a PDF, drop a YouTube link, or paste an article URL to instantly extract summaries and key insights.
              </p>
            </motion.div>

            {/* Input Box Always Visible */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 w-full">
              <div className="flex flex-wrap gap-2 mb-6 bg-[#020617] p-1 rounded-lg w-fit mx-auto border border-slate-800">
                <TabButton active={activeTab === "youtube"} onClick={() => setActiveTab("youtube")} icon={<Video size={18} />} label="YouTube" />
                <TabButton active={activeTab === "url"} onClick={() => setActiveTab("url")} icon={<LinkIcon size={18} />} label="Article URL" />
                <TabButton active={activeTab === "pdf"} onClick={() => setActiveTab("pdf")} icon={<FileText size={18} />} label="PDF Upload" />
              </div>

              <div className="mt-4">
                {activeTab === "pdf" ? (
                  <div className="relative border-2 border-dashed border-slate-700 hover:border-blue-500 transition-colors rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:cursor-pointer bg-[#020617]/50">
                    <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={isProcessing} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                    {isProcessing ? (
                      <><Loader2 size={48} className="text-blue-500 mb-4 animate-spin" /><p className="text-blue-400 font-medium">Extracting Summary & Insights...</p></>
                    ) : (
                      <>
                        <UploadCloud size={48} className="text-slate-500 mb-4" />
                        <p className="text-slate-400 font-medium text-center">Click or Drag & Drop your PDF here<br/>
                          <span className="text-xs text-slate-500 mt-1 block">
                            (Max size: {userPlan === 'ultra' ? '100MB' : userPlan === 'pro' ? '50MB' : '5MB'} for your plan)
                          </span>
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      disabled={isProcessing}
                      placeholder={activeTab === "youtube" ? "Paste YouTube Video Link here..." : "Paste Article URL here..."}
                      className="w-full bg-[#020617] border border-slate-700 text-slate-200 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16"
                      value={inputValue || ""} 
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                    />
                    <button onClick={handleAnalyze} disabled={isProcessing || !inputValue} className="absolute right-3 top-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 border border-slate-700 text-white p-2 rounded-lg w-10 h-10 flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed">
                      {isProcessing ? <Loader2 size={20} className="animate-spin text-slate-400" /> : <Send size={20} className="text-slate-300" />}
                    </button>
                  </div>
                )}
                
                {statusMessage && (
                  <div className={`mt-4 p-4 rounded-xl flex items-center justify-between text-sm font-medium border ${statusMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
                    <span>{statusMessage.text}</span>
                    {(statusMessage.text.includes("limit") || statusMessage.text.includes("large")) && (
                      <Link href="/pricing" className="underline font-bold ml-4 whitespace-nowrap">Upgrade Now</Link>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {summaryData && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex justify-center mb-8 px-6">
               <div className="h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
            </motion.div>
          )}

          {summaryData && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 md:px-6 pb-20">
              
              {/* LEFT COLUMN: Summary */}
              <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl shadow-xl p-6 flex flex-col h-[650px] relative overflow-hidden">
                <div className="flex items-center space-x-3 mb-6 shrink-0 border-b border-slate-800 pb-4">
                  <div className="p-2 bg-emerald-500/20 rounded-lg"><Sparkles className="text-emerald-400" size={24} /></div>
                  <h2 className="text-xl font-bold text-slate-100">Summary & Insights</h2>
                </div>
                
                <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 w-full">
                  <div className="w-full">
                    {formatSummaryText(summaryData)}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Chatbot */}
              <div className="bg-slate-900 border border-blue-900/50 rounded-2xl shadow-xl p-6 flex flex-col h-[650px] relative">
                <div className="flex items-center space-x-3 mb-6 shrink-0 border-b border-slate-800 pb-4">
                  <div className="p-2 bg-blue-600/20 rounded-lg"><Bot className="text-blue-400" size={24} /></div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">Thinklytics AI</h2>
                    <p className="text-xs text-emerald-400 font-medium">Ready to answer questions</p>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 custom-scrollbar">
                  {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role !== "user" && (
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mr-2 shrink-0 mt-1">
                            <Bot size={16} className="text-blue-400" />
                        </div>
                      )}
                      <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isChatting && (
                    <div className="flex justify-start">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mr-2 shrink-0 mt-1 animate-pulse"><Bot size={16} className="text-blue-400" /></div>
                      <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-700"><Loader2 size={16} className="animate-spin text-slate-400" /></div>
                    </div>
                  )}
                </div>

                <div className="relative shrink-0 mt-auto">
                  <input
                    type="text"
                    disabled={isChatting || !currentChatId}
                    value={chatInput || ""}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={currentChatId ? "Ask anything..." : "Please analyze a document first..."}
                    className="w-full bg-[#020617] border border-slate-700 text-slate-200 rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <button onClick={handleSendMessage} disabled={isChatting || !chatInput.trim() || !currentChatId} className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white p-2 rounded-lg cursor-pointer disabled:cursor-not-allowed">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all font-medium text-sm cursor-pointer ${active ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}>
      {icon}<span className="hidden sm:inline">{label}</span>
    </button>
  );
}