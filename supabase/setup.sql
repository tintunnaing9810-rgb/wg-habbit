-- Drop old tables
DROP TABLE IF EXISTS public.reactions CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.milestones CASCADE;

-- Users: remove total_points, add grace day tracking + avatar
ALTER TABLE IF EXISTS public.users DROP COLUMN IF EXISTS total_points;
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS grace_week_year INTEGER,
  ADD COLUMN IF NOT EXISTS grace_week_num INTEGER;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  grace_week_year INTEGER,
  grace_week_num INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_select_all" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_select_all" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '✅',
  category TEXT NOT NULL DEFAULT 'Custom' CHECK (category IN ('Health & Body', 'Mind & Focus', 'No Bad Habits', 'Custom')),
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekdays', 'x_per_week')),
  frequency_target INTEGER NOT NULL DEFAULT 1,
  target_type TEXT NOT NULL DEFAULT 'yes_no' CHECK (target_type IN ('yes_no', 'quantity')),
  target_quantity INTEGER,
  is_public BOOLEAN NOT NULL DEFAULT false,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_logged_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habits_select_own" ON public.habits;
DROP POLICY IF EXISTS "habits_select_public" ON public.habits;
DROP POLICY IF EXISTS "habits_insert_own" ON public.habits;
DROP POLICY IF EXISTS "habits_update_own" ON public.habits;
DROP POLICY IF EXISTS "habits_delete_own" ON public.habits;
CREATE POLICY "habits_select_own" ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "habits_select_public" ON public.habits FOR SELECT USING (is_public = true);
CREATE POLICY "habits_insert_own" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habits_update_own" ON public.habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "habits_delete_own" ON public.habits FOR DELETE USING (auth.uid() = user_id);

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
DROP POLICY IF EXISTS "logs_select_own" ON public.habit_logs;
DROP POLICY IF EXISTS "logs_select_public" ON public.habit_logs;
DROP POLICY IF EXISTS "logs_insert_own" ON public.habit_logs;
DROP POLICY IF EXISTS "logs_delete_own" ON public.habit_logs;
CREATE POLICY "logs_select_own" ON public.habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "logs_select_public" ON public.habit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.habits WHERE habits.id = habit_logs.habit_id AND habits.is_public = true)
);
CREATE POLICY "logs_insert_own" ON public.habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "logs_delete_own" ON public.habit_logs FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.habit_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id UUID NOT NULL REFERENCES public.habit_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (log_id, user_id)
);

ALTER TABLE public.habit_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reactions_select_all" ON public.habit_reactions;
DROP POLICY IF EXISTS "reactions_insert_own" ON public.habit_reactions;
DROP POLICY IF EXISTS "reactions_delete_own" ON public.habit_reactions;
CREATE POLICY "reactions_select_all" ON public.habit_reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert_own" ON public.habit_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_delete_own" ON public.habit_reactions FOR DELETE USING (auth.uid() = user_id);
