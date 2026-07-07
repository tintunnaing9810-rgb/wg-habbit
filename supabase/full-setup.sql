-- ============================================================
-- Worst Generation — Full Database Setup
-- Run this once in a fresh Supabase project SQL Editor
-- ============================================================


-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  grace_week_year INTEGER,
  grace_week_num INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_all" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);


-- ============================================================
-- HABITS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '✅',
  category TEXT NOT NULL DEFAULT 'Custom'
    CHECK (category IN ('Health & Body', 'Mind & Focus', 'No Bad Habits', 'Custom')),
  frequency TEXT NOT NULL DEFAULT 'daily'
    CHECK (frequency IN ('daily', 'weekdays', 'x_per_week')),
  frequency_target INTEGER NOT NULL DEFAULT 1,
  target_type TEXT NOT NULL DEFAULT 'yes_no'
    CHECK (target_type IN ('yes_no', 'quantity')),
  target_quantity INTEGER,
  target_unit TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_logged_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habits_select_own"    ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "habits_select_public" ON public.habits FOR SELECT USING (is_public = true);
CREATE POLICY "habits_insert_own"    ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habits_update_own"    ON public.habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "habits_delete_own"    ON public.habits FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- HABIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  quantity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (habit_id, log_date)
);

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_select_own"    ON public.habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "logs_select_public" ON public.habit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.habits WHERE habits.id = habit_logs.habit_id AND habits.is_public = true)
);
CREATE POLICY "logs_insert_own" ON public.habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "logs_delete_own" ON public.habit_logs FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- HABIT REACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.habit_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id UUID NOT NULL REFERENCES public.habit_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (log_id, user_id)
);

ALTER TABLE public.habit_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions_select_all"  ON public.habit_reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert_own"  ON public.habit_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_delete_own"  ON public.habit_reactions FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- FOLLOWS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_select_all"  ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_own"  ON public.follows FOR INSERT WITH CHECK (follower_id = auth.uid());
CREATE POLICY "follows_delete_own"  ON public.follows FOR DELETE USING (follower_id = auth.uid());


-- ============================================================
-- GROUPS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  emoji TEXT NOT NULL DEFAULT '🏆',
  invite_code TEXT UNIQUE DEFAULT substr(md5(gen_random_uuid()::text), 1, 8),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- GROUP MEMBERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);


-- ============================================================
-- GROUP HABITS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.group_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  emoji TEXT NOT NULL DEFAULT '✅',
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- GROUP HABIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.group_habit_logs (
  group_habit_id UUID NOT NULL REFERENCES public.group_habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_habit_id, user_id, log_date)
);


-- ============================================================
-- GROUP HELPER FUNCTION (must come after tables)
-- ============================================================

CREATE OR REPLACE FUNCTION public.auth_user_in_group(gid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = gid AND user_id = auth.uid()
  )
$$;

-- Group creation function (bypasses RLS host-check issue)
CREATE OR REPLACE FUNCTION public.create_group(group_name TEXT, group_emoji TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_group_id UUID;
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.groups (name, emoji, created_by)
  VALUES (group_name, group_emoji, uid)
  RETURNING id INTO new_group_id;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (new_group_id, uid, 'owner');

  RETURN new_group_id;
END;
$$;


-- ============================================================
-- GROUP RLS POLICIES
-- ============================================================

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups_select" ON public.groups FOR SELECT USING (auth_user_in_group(id));
CREATE POLICY "groups_insert" ON public.groups FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "groups_update" ON public.groups FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "groups_delete" ON public.groups FOR DELETE USING (created_by = auth.uid());

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gm_select" ON public.group_members FOR SELECT USING (auth_user_in_group(group_id));
CREATE POLICY "gm_insert" ON public.group_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "gm_delete" ON public.group_members FOR DELETE USING (user_id = auth.uid());

ALTER TABLE public.group_habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gh_select" ON public.group_habits FOR SELECT USING (auth_user_in_group(group_id));
CREATE POLICY "gh_insert" ON public.group_habits FOR INSERT
  WITH CHECK (auth_user_in_group(group_id) AND created_by = auth.uid());
CREATE POLICY "gh_delete" ON public.group_habits FOR DELETE USING (created_by = auth.uid());

ALTER TABLE public.group_habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ghl_select" ON public.group_habit_logs FOR SELECT
  USING (auth_user_in_group((SELECT group_id FROM public.group_habits WHERE id = group_habit_id)));
CREATE POLICY "ghl_insert" ON public.group_habit_logs FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    auth_user_in_group((SELECT group_id FROM public.group_habits WHERE id = group_habit_id))
  );
CREATE POLICY "ghl_delete" ON public.group_habit_logs FOR DELETE USING (user_id = auth.uid());


-- ============================================================
-- STORAGE — avatars bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
