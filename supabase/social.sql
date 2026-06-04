-- Social features: follows + groups
-- Run in Supabase SQL Editor

-- Helper to check group membership without RLS recursion
CREATE OR REPLACE FUNCTION auth_user_in_group(gid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM group_members WHERE group_id = gid AND user_id = auth.uid())
$$;

-- ============================================================
-- FOLLOWS
-- ============================================================
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Users manage own follows" ON follows FOR INSERT WITH CHECK (follower_id = auth.uid());
CREATE POLICY "Users delete own follows" ON follows FOR DELETE USING (follower_id = auth.uid());

-- ============================================================
-- GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  emoji TEXT NOT NULL DEFAULT '🏆',
  invite_code TEXT UNIQUE DEFAULT substr(md5(gen_random_uuid()::text), 1, 8),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can see groups" ON groups FOR SELECT USING (auth_user_in_group(id));
CREATE POLICY "Auth users can create groups" ON groups FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owners can update groups" ON groups FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Owners can delete groups" ON groups FOR DELETE USING (created_by = auth.uid());

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can see membership" ON group_members FOR SELECT USING (auth_user_in_group(group_id));
CREATE POLICY "Users can join groups" ON group_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members can leave" ON group_members FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- GROUP HABITS
-- ============================================================
CREATE TABLE IF NOT EXISTS group_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  emoji TEXT NOT NULL DEFAULT '✅',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE group_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can see habits" ON group_habits FOR SELECT USING (auth_user_in_group(group_id));
CREATE POLICY "Group members can create habits" ON group_habits FOR INSERT
  WITH CHECK (auth_user_in_group(group_id) AND created_by = auth.uid());
CREATE POLICY "Creators can delete habits" ON group_habits FOR DELETE USING (created_by = auth.uid());

-- ============================================================
-- GROUP HABIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS group_habit_logs (
  group_habit_id UUID NOT NULL REFERENCES group_habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_habit_id, user_id, log_date)
);

ALTER TABLE group_habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can see logs" ON group_habit_logs FOR SELECT
  USING (auth_user_in_group((SELECT group_id FROM group_habits WHERE id = group_habit_id)));
CREATE POLICY "Members can log" ON group_habit_logs FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    auth_user_in_group((SELECT group_id FROM group_habits WHERE id = group_habit_id))
  );
CREATE POLICY "Members can undo own logs" ON group_habit_logs FOR DELETE
  USING (user_id = auth.uid());
