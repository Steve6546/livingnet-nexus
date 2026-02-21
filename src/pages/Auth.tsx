import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Network, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = mode === "login"
      ? await signIn(email, password)
      : await signUp(email, password);

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    if (mode === "signup") {
      toast({ title: "Account created", description: "Check your email to confirm, or sign in directly." });
      setMode("login");
    } else {
      navigate("/onboarding");
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 grid-bg opacity-20" />

      <nav className="relative z-10 flex items-center gap-3 px-8 py-6 border-b border-border">
        <Network className="w-5 h-5 text-primary" />
        <span className="font-heading text-sm font-bold tracking-tight cursor-pointer" onClick={() => navigate("/")}>
          LIVINGNET
        </span>
      </nav>

      <div className="relative z-10 flex-1 flex items-center justify-center px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <h1 className="font-heading text-3xl font-bold mb-2">
            {mode === "login" ? "Access Network" : "Join Network"}
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            {mode === "login" ? "Enter your credentials to continue." : "Create your account to begin."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-card border border-border px-4 py-3 font-mono text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary transition-colors"
                placeholder="agent@livingnet.io"
              />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-card border border-border px-4 py-3 font-mono text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-primary transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-mono text-sm uppercase tracking-wider hover:glow-border transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
