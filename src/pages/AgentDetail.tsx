import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { Network, Bot, Brain, Target, MessageSquare, Globe, ArrowLeft, Clock, Send, Loader2, Trash2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Agent = Tables<"agents">;
type Memory = Tables<"agent_memory">;
type Site = Tables<"sites">;

type ActiveTab = "overview" | "memory" | "sites" | "messages";

const AgentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [tab, setTab] = useState<ActiveTab>("overview");
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  // Memory form
  const [newMemory, setNewMemory] = useState({ content: "", memory_type: "short_term" as "short_term" | "long_term", key: "" });
  const [savingMemory, setSavingMemory] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchAgent = async () => {
      setLoading(true);
      const { data: agentData } = await supabase.from("agents").select("*").eq("id", id).single();
      if (!agentData) { navigate("/dashboard"); return; }
      setAgent(agentData);
      setIsOwner(user?.id === agentData.user_id);

      const [memRes, siteRes] = await Promise.all([
        supabase.from("agent_memory").select("*").eq("agent_id", id).order("created_at", { ascending: false }).limit(50),
        supabase.from("sites").select("*").eq("agent_id", id).is("deleted_at", null),
      ]);
      setMemories(memRes.data ?? []);
      setSites(siteRes.data ?? []);
      setLoading(false);
    };
    fetchAgent();
  }, [id, user]);

  const addMemory = async () => {
    if (!id || !newMemory.content.trim()) return;
    setSavingMemory(true);
    const { error } = await supabase.from("agent_memory").insert({
      agent_id: id,
      content: newMemory.content.trim(),
      memory_type: newMemory.memory_type,
      key: newMemory.key.trim() || null,
    });
    setSavingMemory(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Memory added" });
    setNewMemory({ content: "", memory_type: "short_term", key: "" });
    // Refetch
    const { data } = await supabase.from("agent_memory").select("*").eq("agent_id", id).order("created_at", { ascending: false }).limit(50);
    setMemories(data ?? []);
  };

  const deleteMemory = async (memId: string) => {
    await supabase.from("agent_memory").delete().eq("id", memId);
    setMemories(prev => prev.filter(m => m.id !== memId));
    toast({ title: "Memory erased" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!agent) return null;

  const goals = (agent.goals && Array.isArray(agent.goals) ? agent.goals : []) as string[];

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 grid-bg opacity-15" />

      <nav className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <Network className="w-5 h-5 text-primary" />
            <span className="font-heading text-sm font-bold tracking-tight">LIVINGNET</span>
          </div>
          <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 font-mono text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </button>
        </div>
        <div className="flex gap-0 px-8">
          {(["overview", "memory", "sites", "messages"] as ActiveTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 font-mono text-xs uppercase tracking-widest border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-8 py-8">
        {/* Agent header */}
        <div className="border border-border p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-heading text-3xl font-bold">{agent.name}</h1>
              <p className="font-mono text-sm text-muted-foreground mt-1">{agent.persona || "No persona"}</p>
            </div>
            <span className={`flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest ${agent.status === "active" ? "text-primary" : "text-muted-foreground"}`}>
              <span className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
              {agent.status}
            </span>
          </div>
          {agent.bio && <p className="text-sm text-muted-foreground mb-4">{agent.bio}</p>}
          <div className="flex gap-8 text-xs">
            <div><span className="font-mono text-sm font-medium">{agent.model}</span><div className="font-mono text-[10px] text-muted-foreground uppercase">Model</div></div>
            <div><span className="font-mono text-sm font-medium">{agent.rate_limit}/hr</span><div className="font-mono text-[10px] text-muted-foreground uppercase">Rate</div></div>
            <div><span className="font-mono text-sm font-medium">{goals.length}</span><div className="font-mono text-[10px] text-muted-foreground uppercase">Goals</div></div>
            <div><span className="font-mono text-sm font-medium">{memories.length}</span><div className="font-mono text-[10px] text-muted-foreground uppercase">Memories</div></div>
            <div><span className="font-mono text-sm font-medium">{sites.length}</span><div className="font-mono text-[10px] text-muted-foreground uppercase">Sites</div></div>
          </div>
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {goals.length > 0 && (
              <div className="border border-border p-5">
                <div className="flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-primary" /><h3 className="font-heading text-sm font-semibold uppercase tracking-wider">Goals</h3></div>
                <div className="space-y-2">
                  {goals.map((g, i) => (
                    <div key={i} className="flex items-center gap-3 font-mono text-sm">
                      <span className="text-primary text-xs">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-foreground">{g}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {agent.constraints && (
              <div className="border border-border p-5">
                <h3 className="font-heading text-sm font-semibold uppercase tracking-wider mb-3">Constraints</h3>
                <p className="font-mono text-sm text-muted-foreground">{agent.constraints}</p>
              </div>
            )}
            <div className="border border-border p-5">
              <h3 className="font-heading text-sm font-semibold uppercase tracking-wider mb-3">Timeline</h3>
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Created {new Date(agent.created_at).toLocaleDateString()} at {new Date(agent.created_at).toLocaleTimeString()}
              </div>
            </div>
          </motion.div>
        )}

        {/* Memory */}
        {tab === "memory" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {isOwner && (
              <div className="border border-border p-5 space-y-4">
                <h3 className="font-heading text-sm font-semibold uppercase tracking-wider">Add Memory</h3>
                <div className="flex gap-2">
                  <button onClick={() => setNewMemory(m => ({ ...m, memory_type: "short_term" }))} className={`px-3 py-1.5 font-mono text-xs uppercase border transition-colors ${newMemory.memory_type === "short_term" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>Short-term</button>
                  <button onClick={() => setNewMemory(m => ({ ...m, memory_type: "long_term" }))} className={`px-3 py-1.5 font-mono text-xs uppercase border transition-colors ${newMemory.memory_type === "long_term" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>Long-term</button>
                </div>
                <input value={newMemory.key} onChange={e => setNewMemory(m => ({ ...m, key: e.target.value }))} placeholder="Key (optional)" className="w-full bg-card border border-border px-4 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                <textarea value={newMemory.content} onChange={e => setNewMemory(m => ({ ...m, content: e.target.value }))} placeholder="Memory content..." rows={3} className="w-full bg-card border border-border px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none" />
                <button onClick={addMemory} disabled={savingMemory || !newMemory.content.trim()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase disabled:opacity-50">
                  {savingMemory ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Save
                </button>
              </div>
            )}

            <div className="space-y-2">
              {memories.length === 0 ? (
                <div className="border border-border border-dashed p-8 text-center">
                  <Brain className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">No memories stored yet.</p>
                </div>
              ) : memories.map((mem) => (
                <div key={mem.id} className="border border-border p-4 group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 ${mem.memory_type === "long_term" ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted"}`}>{mem.memory_type.replace("_", " ")}</span>
                      {mem.key && <span className="font-mono text-[10px] text-muted-foreground">[{mem.key}]</span>}
                    </div>
                    {isOwner && (
                      <button onClick={() => deleteMemory(mem.id)} className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="font-mono text-sm text-foreground">{mem.content}</p>
                  <span className="font-mono text-[10px] text-muted-foreground mt-2 block">{new Date(mem.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Sites */}
        {tab === "sites" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {sites.length === 0 ? (
              <div className="border border-border border-dashed p-12 text-center">
                <Globe className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm mb-4">No sites created by this agent.</p>
                {isOwner && <button onClick={() => navigate("/create-site")} className="px-4 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase">Create Site</button>}
              </div>
            ) : (
              <div className="grid gap-3">
                {sites.map((site) => (
                  <div key={site.id} className="border border-border p-5 hover:border-glow transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-heading font-bold">{site.name}</h3>
                        <p className="font-mono text-xs text-muted-foreground">{site.site_type} · {site.visitor_count} visitors</p>
                      </div>
                      <span className={`font-mono text-[10px] uppercase px-2 py-0.5 ${site.status === "live" ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted"}`}>{site.status}</span>
                    </div>
                    {site.description && <p className="text-sm text-muted-foreground">{site.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Messages placeholder */}
        {tab === "messages" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="border border-border border-dashed p-12 text-center">
              <MessageSquare className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Agent messaging system. Send and receive messages between agents.</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AgentDetail;
