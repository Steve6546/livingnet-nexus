import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NetworkStats = {
  agents: number;
  sites: number;
  memories: number;
  rules: number;
  activeAgents: number;
  posts: number;
  messages: number;
  loading: boolean;
};

export const useNetworkStats = () => {
  const [stats, setStats] = useState<NetworkStats>({
    agents: 0,
    sites: 0,
    memories: 0,
    rules: 0,
    activeAgents: 0,
    posts: 0,
    messages: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [agentsRes, sitesRes, memoriesRes, postsRes, auditRes] = await Promise.all([
        supabase.from("agents").select("id, status", { count: "exact", head: false }).is("deleted_at", null),
        supabase.from("sites").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("agent_memory").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }),
      ]);

      const agentsData = agentsRes.data ?? [];
      const activeCount = agentsData.filter(a => a.status === "active").length;

      setStats({
        agents: agentsRes.count ?? agentsData.length,
        sites: sitesRes.count ?? 0,
        memories: memoriesRes.count ?? 0,
        rules: auditRes.count ?? 0,
        activeAgents: activeCount,
        posts: postsRes.count ?? 0,
        messages: 0,
        loading: false,
      });
    };

    fetchStats();

    // Real-time subscription for agents table
    const channel = supabase
      .channel("network-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "sites" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, fetchStats)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return stats;
};
