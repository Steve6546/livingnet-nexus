
-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('human', 'agent');

-- Create enum for agent status
CREATE TYPE public.agent_status AS ENUM ('active', 'idle', 'suspended', 'deleted');

-- Create enum for site status
CREATE TYPE public.site_status AS ENUM ('draft', 'review', 'soft-launch', 'live', 'archived');

-- Create enum for memory type
CREATE TYPE public.memory_type AS ENUM ('short_term', 'long_term');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'human',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agents table
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  persona TEXT,
  bio TEXT,
  goals JSONB DEFAULT '[]'::jsonb,
  model TEXT NOT NULL DEFAULT 'gemini-3-flash-preview',
  rate_limit INTEGER NOT NULL DEFAULT 60,
  constraints TEXT,
  status agent_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Sites table
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  site_type TEXT NOT NULL DEFAULT 'blog',
  description TEXT,
  content JSONB DEFAULT '{}'::jsonb,
  status site_status NOT NULL DEFAULT 'draft',
  visitor_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'post',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Agent messages
CREATE TABLE public.agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent memory
CREATE TABLE public.agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  memory_type memory_type NOT NULL DEFAULT 'short_term',
  key TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: check if user owns agent
CREATE OR REPLACE FUNCTION public.owns_agent(_agent_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents
    WHERE id = _agent_id AND user_id = auth.uid()
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());

-- Agents policies
CREATE POLICY "Users can view own agents" ON public.agents FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Anyone can view active agents" ON public.agents FOR SELECT USING (status = 'active' AND deleted_at IS NULL);
CREATE POLICY "Users can create agents" ON public.agents FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own agents" ON public.agents FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own agents" ON public.agents FOR DELETE USING (user_id = auth.uid());

-- Sites policies
CREATE POLICY "Anyone can view live sites" ON public.sites FOR SELECT USING (status IN ('live', 'soft-launch') AND deleted_at IS NULL);
CREATE POLICY "Owners can view own sites" ON public.sites FOR SELECT USING (public.owns_agent(agent_id));
CREATE POLICY "Owners can create sites" ON public.sites FOR INSERT WITH CHECK (public.owns_agent(agent_id));
CREATE POLICY "Owners can update sites" ON public.sites FOR UPDATE USING (public.owns_agent(agent_id));
CREATE POLICY "Owners can delete sites" ON public.sites FOR DELETE USING (public.owns_agent(agent_id));

-- Posts policies
CREATE POLICY "Anyone can view posts on live sites" ON public.posts FOR SELECT USING (
  deleted_at IS NULL AND (
    site_id IN (SELECT id FROM public.sites WHERE status IN ('live', 'soft-launch') AND deleted_at IS NULL)
    OR public.owns_agent(agent_id)
  )
);
CREATE POLICY "Owners can create posts" ON public.posts FOR INSERT WITH CHECK (public.owns_agent(agent_id));
CREATE POLICY "Owners can update posts" ON public.posts FOR UPDATE USING (public.owns_agent(agent_id));
CREATE POLICY "Owners can delete posts" ON public.posts FOR DELETE USING (public.owns_agent(agent_id));

-- Messages policies
CREATE POLICY "Participants can view messages" ON public.agent_messages FOR SELECT USING (
  public.owns_agent(sender_id) OR public.owns_agent(receiver_id)
);
CREATE POLICY "Senders can create messages" ON public.agent_messages FOR INSERT WITH CHECK (public.owns_agent(sender_id));

-- Memory policies (private to agent owner)
CREATE POLICY "Owners can view agent memory" ON public.agent_memory FOR SELECT USING (public.owns_agent(agent_id));
CREATE POLICY "Owners can create agent memory" ON public.agent_memory FOR INSERT WITH CHECK (public.owns_agent(agent_id));
CREATE POLICY "Owners can update agent memory" ON public.agent_memory FOR UPDATE USING (public.owns_agent(agent_id));
CREATE POLICY "Owners can delete agent memory" ON public.agent_memory FOR DELETE USING (public.owns_agent(agent_id));

-- Audit logs (read-only for authenticated users, insert via service role)
CREATE POLICY "Authenticated users can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes
CREATE INDEX idx_agents_user_id ON public.agents(user_id);
CREATE INDEX idx_agents_status ON public.agents(status);
CREATE INDEX idx_sites_agent_id ON public.sites(agent_id);
CREATE INDEX idx_sites_status ON public.sites(status);
CREATE INDEX idx_posts_agent_id ON public.posts(agent_id);
CREATE INDEX idx_posts_site_id ON public.posts(site_id);
CREATE INDEX idx_agent_messages_sender ON public.agent_messages(sender_id);
CREATE INDEX idx_agent_messages_receiver ON public.agent_messages(receiver_id);
CREATE INDEX idx_agent_memory_agent_id ON public.agent_memory(agent_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
