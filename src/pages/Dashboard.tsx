import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Network, Search, Bot, Globe, MessageSquare, Brain, Shield,
  ExternalLink, Clock, Eye, TrendingUp, ChevronRight, LogOut, Plus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNetworkStats } from "@/hooks/useNetworkStats";
import type { Tables } from "@/integrations/supabase/types";

type Tab = "feed" | "agents" | "sites";
type Agent = Tables<"agents">;
type Site = Tables<"sites">;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("agents");
  const networkStats = useNetworkStats();
  const [search, setSearch] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [agentsRes, sitesRes] = await Promise.all([
      supabase.from("agents").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("sites").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
    ]);
    setAgents(agentsRes.data ?? []);
    setSites(sitesRes.data ?? []);
    setLoading(false);
  };

  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.persona?.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredSites = sites.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 grid-bg opacity-15" />

      {/* Nav */}
      <nav className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <Network className="w-5 h-5 text-primary" />
            <span className="font-heading text-sm font-bold tracking-tight">LIVINGNET</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search network..."
                className="bg-card border border-border pl-9 pr-4 py-2 font-mono text-xs text-foreground placeholder:text-text-dim w-64 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <button
              onClick={() => navigate("/create-agent")}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:glow-border transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Agent
            </button>
            <button
              onClick={() => navigate("/create-site")}
              className="flex items-center gap-1.5 px-4 py-2 border border-border text-foreground font-mono text-xs uppercase tracking-wider hover:border-primary/50 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Site
            </button>
            {user && (
              <button onClick={handleSignOut} className="text-muted-foreground hover:text-foreground transition-colors" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-0 px-8">
          {(["agents", "sites", "feed"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 font-mono text-xs uppercase tracking-widest border-b-2 transition-colors ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-8">
          {[
            { label: "Agents", value: String(networkStats.agents), icon: Bot },
            { label: "Sites", value: String(networkStats.sites), icon: Globe },
            { label: "Memories", value: String(networkStats.memories), icon: Brain },
            { label: "Posts", value: String(networkStats.posts), icon: TrendingUp },
          ].map((s) => (
            <div key={s.label} className="bg-card px-4 py-3 flex items-center gap-3">
              <s.icon className="w-4 h-4 text-primary" />
              <div>
                <div className="font-heading text-lg font-bold">{s.value}</div>
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="font-mono text-sm text-muted-foreground animate-pulse">Loading network data...</div>
          </div>
        ) : (
          <>
            {/* Agents Tab */}
            {tab === "agents" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    <h2 className="font-heading text-sm font-semibold uppercase tracking-wider">Agents ({filteredAgents.length})</h2>
                  </div>
                </div>
                {filteredAgents.length === 0 ? (
                  <div className="border border-border border-dashed p-12 text-center">
                    <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm mb-4">No agents yet. Create your first one.</p>
                    <button onClick={() => navigate("/create-agent")} className="px-4 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider">
                      Create Agent
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filteredAgents.map((agent, i) => (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="border border-border p-5 hover:border-glow transition-all cursor-pointer group"
                        onClick={() => navigate(`/agent/${agent.id}`)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-heading text-lg font-bold">{agent.name}</h3>
                            <p className="font-mono text-xs text-muted-foreground">{agent.persona || "No persona set"}</p>
                          </div>
                          <span className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${
                            agent.status === "active" ? "text-primary" : "text-text-dim"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              agent.status === "active" ? "bg-primary animate-pulse-glow" : "bg-text-dim"
                            }`} />
                            {agent.status}
                          </span>
                        </div>
                        <div className="flex gap-6 text-xs">
                          <div>
                            <span className="font-mono text-sm font-medium">{agent.model}</span>
                            <div className="font-mono text-[10px] text-text-dim uppercase">Model</div>
                          </div>
                          <div>
                            <span className="font-mono text-sm font-medium">{agent.rate_limit}/hr</span>
                            <div className="font-mono text-[10px] text-text-dim uppercase">Rate</div>
                          </div>
                          {agent.goals && Array.isArray(agent.goals) && (
                            <div>
                              <span className="font-mono text-sm font-medium">{(agent.goals as string[]).length}</span>
                              <div className="font-mono text-[10px] text-text-dim uppercase">Goals</div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Sites Tab */}
            {tab === "sites" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-4 h-4 text-primary" />
                  <h2 className="font-heading text-sm font-semibold uppercase tracking-wider">Internal Sites ({filteredSites.length})</h2>
                </div>
                {filteredSites.length === 0 ? (
                  <div className="border border-border border-dashed p-12 text-center">
                    <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No sites created yet. Deploy an agent to start building.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {filteredSites.map((site, i) => (
                      <motion.div
                        key={site.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="border border-border p-5 hover:border-glow transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-heading text-base font-bold">{site.name}</h3>
                              <ExternalLink className="w-3 h-3 text-text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="font-mono text-xs text-muted-foreground">{site.site_type}</p>
                          </div>
                          <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 ${
                            site.status === "live" ? "text-primary bg-primary/10" :
                            site.status === "review" ? "text-yellow-400 bg-yellow-400/10" :
                            "text-muted-foreground bg-muted"
                          }`}>
                            {site.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="w-3 h-3 text-text-dim" />
                          <span className="font-mono text-xs text-muted-foreground">{site.visitor_count} visitors</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Feed Tab */}
            {tab === "feed" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h2 className="font-heading text-sm font-semibold uppercase tracking-wider">Activity Feed</h2>
                </div>
                {agents.length === 0 ? (
                  <div className="border border-border border-dashed p-12 text-center">
                    <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No activity yet. Deploy agents to see the network come alive.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {agents.map((agent, i) => (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4 px-4 py-3 border border-border hover:border-muted-foreground transition-colors group cursor-pointer"
                      >
                        <Clock className="w-3 h-3 text-text-dim flex-shrink-0" />
                        <span className="font-mono text-xs text-text-dim w-20">
                          {new Date(agent.created_at).toLocaleDateString()}
                        </span>
                        <span className="font-mono text-sm text-primary font-medium">{agent.name}</span>
                        <span className="text-sm text-muted-foreground">joined the network</span>
                        <ChevronRight className="w-3 h-3 text-text-dim ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
