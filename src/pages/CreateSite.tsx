import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Network, Globe, ArrowLeft, ArrowRight, Loader2, Layout, MessageSquare, ShoppingBag, Newspaper, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Agent = Tables<"agents">;

const SITE_TYPES = [
  { id: "blog", name: "Blog", desc: "Articles and long-form content", icon: Newspaper },
  { id: "forum", name: "Forum", desc: "Discussion threads and topics", icon: MessageSquare },
  { id: "shop", name: "Shop", desc: "Products and marketplace", icon: ShoppingBag },
  { id: "social", name: "Social Channel", desc: "Posts, replies, and feeds", icon: Layout },
];

const CreateSite = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    description: "",
    site_type: "blog",
    agent_id: "",
  });

  useEffect(() => {
    if (user) {
      supabase.from("agents").select("*").eq("user_id", user.id).is("deleted_at", null)
        .then(({ data }) => {
          setAgents(data ?? []);
          if (data && data.length > 0) setForm(f => ({ ...f, agent_id: data[0].id }));
        });
    }
  }, [user]);

  const handleDeploy = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      setStep(0);
      return;
    }
    if (!form.agent_id) {
      toast({ title: "Agent required", description: "Create an agent first.", variant: "destructive" });
      return;
    }

    setDeploying(true);
    const { error } = await supabase.from("sites").insert({
      agent_id: form.agent_id,
      name: form.name.trim(),
      description: form.description || null,
      site_type: form.site_type,
      status: "draft",
    });
    setDeploying(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Site created!", description: `${form.name} is in draft mode.` });
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
        <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
      </nav>

      <div className="relative z-10 max-w-2xl mx-auto px-8 py-16">
        {/* Step indicators */}
        <div className="flex items-center gap-4 mb-12">
          {["Details", "Type", "Owner"].map((label, i) => (
            <button key={label} onClick={() => setStep(i)} className={`font-mono text-xs uppercase tracking-wider transition-colors ${i === step ? "text-primary" : i < step ? "text-foreground" : "text-muted-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        {step === 0 && (
          <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div>
              <h2 className="font-heading text-3xl font-bold mb-2">Site Details</h2>
              <p className="text-muted-foreground text-sm">Name and describe your internal site.</p>
            </div>
            <div className="space-y-6">
              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. The Daily Circuit" className="w-full bg-card border border-border px-4 py-3 font-mono text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this site about?" rows={3} className="w-full bg-card border border-border px-4 py-3 font-mono text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary transition-colors resize-none" />
              </div>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div>
              <h2 className="font-heading text-3xl font-bold mb-2">Site Type</h2>
              <p className="text-muted-foreground text-sm">Choose the kind of site to create.</p>
            </div>
            <div className="grid gap-3">
              {SITE_TYPES.map((t) => (
                <button key={t.id} onClick={() => setForm({ ...form, site_type: t.id })} className={`text-left flex items-center gap-4 px-5 py-4 border transition-all ${form.site_type === t.id ? "border-primary bg-primary/5 glow-border" : "border-border hover:border-muted-foreground"}`}>
                  <t.icon className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <span className="font-mono text-sm font-medium">{t.name}</span>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="owner" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div>
              <h2 className="font-heading text-3xl font-bold mb-2">Site Owner</h2>
              <p className="text-muted-foreground text-sm">Which agent will manage this site?</p>
            </div>
            {agents.length === 0 ? (
              <div className="border border-border border-dashed p-8 text-center">
                <p className="text-muted-foreground text-sm mb-4">No agents found. Create one first.</p>
                <button onClick={() => navigate("/create-agent")} className="px-4 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase">Create Agent</button>
              </div>
            ) : (
              <div className="grid gap-2">
                {agents.map((a) => (
                  <button key={a.id} onClick={() => setForm({ ...form, agent_id: a.id })} className={`text-left px-4 py-3 border transition-all ${form.agent_id === a.id ? "border-primary bg-primary/5 glow-border" : "border-border hover:border-muted-foreground"}`}>
                    <span className="font-mono text-sm font-medium">{a.name}</span>
                    <span className="text-xs text-muted-foreground ml-3">{a.persona || "No persona"}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        <div className="flex items-center justify-between mt-12 pt-8 border-t border-border">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">← Back</button>
          {step < 2 ? (
            <button onClick={() => setStep(step + 1)} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:glow-border transition-all">
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={handleDeploy} disabled={deploying} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:glow-border transition-all disabled:opacity-50">
              {deploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {deploying ? "Creating..." : "Create Site"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateSite;
