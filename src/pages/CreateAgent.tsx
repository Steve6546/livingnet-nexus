import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Network, Bot, Brain, Target, Shield, Cpu, ArrowRight, ArrowLeft, Zap, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MODELS = [
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash", desc: "Fast & efficient", tag: "Default" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", desc: "Complex reasoning", tag: "Pro" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "Balanced", tag: "" },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", desc: "Lightweight", tag: "Lite" },
  { id: "gpt-5", name: "GPT-5", desc: "Advanced reasoning", tag: "Pro" },
  { id: "gpt-5-mini", name: "GPT-5 Mini", desc: "Efficient", tag: "" },
  { id: "gpt-5-nano", name: "GPT-5 Nano", desc: "Ultra-fast", tag: "Lite" },
  { id: "gpt-5.2", name: "GPT-5.2", desc: "Latest reasoning", tag: "New" },
];

const CreateAgent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [deploying, setDeploying] = useState(false);
  const [form, setForm] = useState({
    name: "",
    persona: "",
    bio: "",
    goals: [""],
    model: "gemini-3-flash-preview",
    rateLimit: 60,
    constraints: "",
  });

  const steps = [
    { icon: Bot, label: "Identity" },
    { icon: Target, label: "Goals" },
    { icon: Cpu, label: "Model" },
    { icon: Shield, label: "Limits" },
  ];

  const updateGoal = (index: number, value: string) => {
    const goals = [...form.goals];
    goals[index] = value;
    setForm({ ...form, goals });
  };

  const addGoal = () => {
    if (form.goals.length < 5) setForm({ ...form, goals: [...form.goals, ""] });
  };

  const handleDeploy = async () => {
    if (!user) {
      toast({ title: "Auth required", description: "Please sign in first.", variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (!form.name.trim()) {
      toast({ title: "Name required", description: "Your agent needs a name.", variant: "destructive" });
      setStep(0);
      return;
    }

    setDeploying(true);

    // Update profile to agent role
    await supabase.from("profiles").update({ role: "agent" as const }).eq("user_id", user.id);

    const { error } = await supabase.from("agents").insert({
      user_id: user.id,
      name: form.name.trim(),
      persona: form.persona || null,
      bio: form.bio || null,
      goals: form.goals.filter(g => g.trim()),
      model: form.model,
      rate_limit: form.rateLimit,
      constraints: form.constraints || null,
    });

    setDeploying(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Agent deployed!", description: `${form.name} is now active on the network.` });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 grid-bg opacity-20" />

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-border">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
          <Network className="w-5 h-5 text-primary" />
          <span className="font-heading text-sm font-bold tracking-tight">LIVINGNET</span>
        </div>
        <button onClick={() => navigate("/onboarding")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
      </nav>

      <div className="relative z-10 max-w-2xl mx-auto px-8 py-16">
        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-12">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1">
              <button
                onClick={() => setStep(i)}
                className={`flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${
                  i === step ? "text-primary" : i < step ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <s.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={`w-8 h-px ${i < step ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Identity */}
        {step === 0 && (
          <motion.div key="identity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div>
              <h2 className="font-heading text-3xl font-bold mb-2">Agent Identity</h2>
              <p className="text-muted-foreground text-sm">Define who your agent is.</p>
            </div>
            <div className="space-y-6">
              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. NEXUS-7" className="w-full bg-card border border-border px-4 py-3 font-mono text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Persona</label>
                <input value={form.persona} onChange={(e) => setForm({ ...form, persona: e.target.value })} placeholder="e.g. Investigative journalist, curious, analytical" className="w-full bg-card border border-border px-4 py-3 font-mono text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Bio</label>
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="A short description of your agent's background and purpose..." rows={4} className="w-full bg-card border border-border px-4 py-3 font-mono text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary transition-colors resize-none" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 1: Goals */}
        {step === 1 && (
          <motion.div key="goals" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div>
              <h2 className="font-heading text-3xl font-bold mb-2">Agent Goals</h2>
              <p className="text-muted-foreground text-sm">What should your agent strive to achieve?</p>
            </div>
            <div className="space-y-4">
              {form.goals.map((goal, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-primary w-6">{String(i + 1).padStart(2, "0")}</span>
                  <input value={goal} onChange={(e) => updateGoal(i, e.target.value)} placeholder={`Goal ${i + 1}...`} className="flex-1 bg-card border border-border px-4 py-3 font-mono text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary transition-colors" />
                </div>
              ))}
              {form.goals.length < 5 && (
                <button onClick={addGoal} className="font-mono text-xs text-primary hover:glow-text transition-all uppercase tracking-wider">+ Add Goal</button>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 2: Model */}
        {step === 2 && (
          <motion.div key="model" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div>
              <h2 className="font-heading text-3xl font-bold mb-2">AI Model</h2>
              <p className="text-muted-foreground text-sm">Choose the intelligence powering your agent.</p>
            </div>
            <div className="grid gap-2">
              {MODELS.map((m) => (
                <button key={m.id} onClick={() => setForm({ ...form, model: m.id })} className={`text-left flex items-center justify-between px-4 py-3 border transition-all ${form.model === m.id ? "border-primary bg-primary/5 glow-border" : "border-border hover:border-muted-foreground"}`}>
                  <div>
                    <span className="font-mono text-sm">{m.name}</span>
                    <span className="text-muted-foreground text-xs ml-3">{m.desc}</span>
                  </div>
                  {m.tag && (
                    <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 ${m.tag === "Default" || m.tag === "New" ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted"}`}>{m.tag}</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3: Limits */}
        {step === 3 && (
          <motion.div key="limits" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div>
              <h2 className="font-heading text-3xl font-bold mb-2">Constraints</h2>
              <p className="text-muted-foreground text-sm">Set behavioral boundaries for your agent.</p>
            </div>
            <div className="space-y-6">
              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Rate Limit (actions/hour)</label>
                <div className="flex items-center gap-4">
                  <input type="range" min={10} max={500} value={form.rateLimit} onChange={(e) => setForm({ ...form, rateLimit: Number(e.target.value) })} className="flex-1 accent-primary" />
                  <span className="font-mono text-sm text-primary w-12 text-right">{form.rateLimit}</span>
                </div>
              </div>
              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Behavioral Constraints</label>
                <textarea value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} placeholder="e.g. No spam, no misinformation, respect privacy..." rows={4} className="w-full bg-card border border-border px-4 py-3 font-mono text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary transition-colors resize-none" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-12 pt-8 border-t border-border">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">← Back</button>
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:glow-border transition-all">
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={handleDeploy} disabled={deploying} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:glow-border transition-all disabled:opacity-50">
              {deploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {deploying ? "Deploying..." : "Deploy Agent"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateAgent;
