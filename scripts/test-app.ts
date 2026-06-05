/**
 * Worst Generation — Automated App Test Suite
 * Run: npm test
 *
 * Tests every major feature against the live Supabase database.
 * Uses a dedicated test account so real data is never affected.
 * Cleans up all test data after each run.
 */

import { createClient } from "@supabase/supabase-js";

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TEST_EMAIL = process.env.TEST_EMAIL || "testbot@wg-habbit.dev";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "TestBot123!";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

// ─── Result Tracking ─────────────────────────────────────────────────────────

type Result = { name: string; passed: boolean; detail?: string };
const results: Result[] = [];
let testUserId: string | null = null;

function pass(name: string) {
  results.push({ name, passed: true });
  console.log(`  ✅  ${name}`);
}

function fail(name: string, detail: string) {
  results.push({ name, passed: false, detail });
  console.log(`  ❌  ${name}`);
  console.log(`       → ${detail}`);
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    pass(name);
  } catch (err: unknown) {
    fail(name, err instanceof Error ? err.message : String(err));
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// ─── Supabase Client ─────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Test Sections ────────────────────────────────────────────────────────────

async function testAuth() {
  console.log("\n📋  AUTH");

  await test("Sign in test account", async () => {
    // Call REST API directly to avoid JS client host-check headers
    const APP_URL = process.env.APP_URL || "https://wg-habbit.vercel.app";
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Origin": APP_URL,
        "Referer": APP_URL,
        "X-Client-Info": "supabase-js-web/2.56.0",
      },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const json = await res.json();
    if (!res.ok || !json.access_token) {
      throw new Error(
        (json.error_description || json.msg || JSON.stringify(json)) +
        `\n\n  → Create the test account first:\n` +
        `    1. Open your app → Sign up\n` +
        `    2. Email: ${TEST_EMAIL}\n` +
        `    3. Password: ${TEST_PASSWORD}\n` +
        `    4. Name: Test Bot\n` +
        `    5. Run npm test again`
      );
    }
    // Inject the token into the supabase client
    await supabase.auth.setSession({ access_token: json.access_token, refresh_token: json.refresh_token });
    testUserId = json.user?.id;
    assert(!!testUserId, "No user ID in session response");
  });

  await test("Session is active", async () => {
    const { data } = await supabase.auth.getUser();
    assert(!!data.user, "No active user session");
  });
}

async function testHabits() {
  console.log("\n📋  HABITS");

  let habitId: string | null = null;

  await test("Create a habit (yes/no type)", async () => {
    const { data, error } = await supabase
      .from("habits")
      .insert({
        user_id: testUserId,
        name: "[TEST] Morning Run",
        emoji: "🏃",
        category: "Health & Body",
        frequency: "daily",
        frequency_target: 1,
        target_type: "yes_no",
        is_public: false,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    assert(!!data?.id, "No habit ID returned");
    habitId = data.id;
  });

  await test("Create a habit (quantity type)", async () => {
    const { data, error } = await supabase
      .from("habits")
      .insert({
        user_id: testUserId,
        name: "[TEST] Read",
        emoji: "📚",
        category: "Mind & Focus",
        frequency: "daily",
        frequency_target: 1,
        target_type: "quantity",
        target_quantity: 30,
        target_unit: "min",
        is_public: false,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    assert(!!data?.id, "No habit ID returned");
    // Clean up this one immediately
    await supabase.from("habits").delete().eq("id", data.id);
  });

  await test("Read habits list", async () => {
    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", testUserId);
    if (error) throw new Error(error.message);
    assert(Array.isArray(data), "Expected array of habits");
    assert(data.some((h) => h.name === "[TEST] Morning Run"), "Test habit not found in list");
  });

  await test("Update habit name", async () => {
    if (!habitId) throw new Error("No habit to update");
    const { error } = await supabase
      .from("habits")
      .update({ name: "[TEST] Morning Run (updated)" })
      .eq("id", habitId);
    if (error) throw new Error(error.message);
    const { data } = await supabase.from("habits").select("name").eq("id", habitId).single();
    assert(data?.name === "[TEST] Morning Run (updated)", "Name was not updated");
  });

  await test("Log a habit check-in (yes/no)", async () => {
    if (!habitId) throw new Error("No habit to log");
    const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().split("T")[0];
    const { error } = await supabase.from("habit_logs").insert({
      habit_id: habitId,
      user_id: testUserId,
      log_date: today,
    });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  });

  await test("Cannot log same habit twice on same day", async () => {
    if (!habitId) throw new Error("No habit");
    const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().split("T")[0];
    const { error } = await supabase.from("habit_logs").insert({
      habit_id: habitId,
      user_id: testUserId,
      log_date: today,
    });
    assert(!!error, "Should have gotten a duplicate error");
  });

  await test("Undo a habit log", async () => {
    if (!habitId) throw new Error("No habit");
    const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().split("T")[0];
    const { error } = await supabase
      .from("habit_logs")
      .delete()
      .eq("habit_id", habitId)
      .eq("user_id", testUserId)
      .eq("log_date", today);
    if (error) throw new Error(error.message);
  });

  await test("Delete habit", async () => {
    if (!habitId) throw new Error("No habit to delete");
    const { error } = await supabase.from("habits").delete().eq("id", habitId);
    if (error) throw new Error(error.message);
    const { data } = await supabase.from("habits").select("id").eq("id", habitId).single();
    assert(!data, "Habit still exists after delete");
  });
}

async function testPublicFeed() {
  console.log("\n📋  FEED");

  let publicHabitId: string | null = null;
  let logId: string | null = null;

  await test("Create a public habit", async () => {
    const { data, error } = await supabase
      .from("habits")
      .insert({
        user_id: testUserId,
        name: "[TEST] Public Habit",
        emoji: "🌍",
        category: "Custom",
        frequency: "daily",
        frequency_target: 1,
        target_type: "yes_no",
        is_public: true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    publicHabitId = data.id;
  });

  await test("Log public habit (appears in feed)", async () => {
    if (!publicHabitId) throw new Error("No public habit");
    const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("habit_logs")
      .insert({ habit_id: publicHabitId, user_id: testUserId, log_date: today })
      .select()
      .single();
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    if (data) logId = data.id;
  });

  await test("React to a feed post", async () => {
    if (!logId) { throw new Error("No log ID to react to"); }
    const { error } = await supabase
      .from("habit_reactions")
      .upsert({ log_id: logId, user_id: testUserId, emoji: "🔥" });
    if (error) throw new Error(error.message);
    // Clean up
    await supabase.from("habit_reactions").delete().eq("log_id", logId).eq("user_id", testUserId);
  });

  // Cleanup
  if (publicHabitId) await supabase.from("habits").delete().eq("id", publicHabitId);
}

async function testGroups() {
  console.log("\n📋  GROUPS");

  let groupId: string | null = null;
  let groupHabitId: string | null = null;

  await test("Create a group (via RPC)", async () => {
    const { data, error } = await supabase.rpc("create_group", {
      group_name: "[TEST] Test Squad",
      group_emoji: "🏆",
    });
    if (error) throw new Error(error.message);
    assert(!!data, "No group ID returned from RPC");
    groupId = data;
  });

  await test("Group shows in membership list", async () => {
    if (!groupId) throw new Error("No group");
    const { data, error } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", testUserId)
      .single();
    if (error) throw new Error(error.message);
    assert(data?.role === "owner", `Expected owner role, got ${data?.role}`);
  });

  await test("Add habit to group", async () => {
    if (!groupId) throw new Error("No group");
    const { data, error } = await supabase
      .from("group_habits")
      .insert({ group_id: groupId, name: "[TEST] Group Walk", emoji: "🚶", created_by: testUserId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    assert(!!data?.id, "No group habit ID");
    groupHabitId = data.id;
  });

  await test("Log a group habit check-in", async () => {
    if (!groupHabitId) throw new Error("No group habit");
    const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().split("T")[0];
    const { error } = await supabase
      .from("group_habit_logs")
      .insert({ group_habit_id: groupHabitId, user_id: testUserId, log_date: today });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  });

  await test("Undo group habit log", async () => {
    if (!groupHabitId) throw new Error("No group habit");
    const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().split("T")[0];
    const { error } = await supabase
      .from("group_habit_logs")
      .delete()
      .eq("group_habit_id", groupHabitId)
      .eq("user_id", testUserId)
      .eq("log_date", today);
    if (error) throw new Error(error.message);
  });

  await test("Delete group", async () => {
    if (!groupId) throw new Error("No group");
    const { error } = await supabase.from("groups").delete().eq("id", groupId);
    if (error) throw new Error(error.message);
  });
}

async function testFollows() {
  console.log("\n📋  FOLLOWS");

  let targetUserId: string | null = null;

  await test("Search for users", async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, name")
      .neq("id", testUserId)
      .limit(1);
    if (error) throw new Error(error.message);
    if (data && data.length > 0) targetUserId = data[0].id;
    // It's OK if no other users exist yet
  });

  if (targetUserId) {
    await test("Follow a user", async () => {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: testUserId, following_id: targetUserId });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    });

    await test("Unfollow a user", async () => {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", testUserId)
        .eq("following_id", targetUserId);
      if (error) throw new Error(error.message);
    });
  } else {
    results.push({ name: "Follow/Unfollow (skipped — only 1 user exists)", passed: true });
    console.log(`  ⏭️   Follow/Unfollow (skipped — only 1 user exists)`);
  }
}

async function testRLS() {
  console.log("\n📋  SECURITY (RLS)");

  await test("Cannot read another user's private habits", async () => {
    // Create an anonymous client (not signed in) and try to read habits
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await anonClient.from("habits").select("*").neq("user_id", testUserId);
    assert(!data || data.length === 0, `RLS breach: got ${data?.length} habits from another user`);
  });

  await test("Cannot create habit for another user", async () => {
    const fakeUserId = "00000000-0000-0000-0000-000000000000";
    const { error } = await supabase
      .from("habits")
      .insert({
        user_id: fakeUserId,
        name: "[SHOULD FAIL]",
        emoji: "🚫",
        category: "Custom",
        frequency: "daily",
        frequency_target: 1,
        target_type: "yes_no",
      });
    assert(!!error, "Should have been blocked by RLS");
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  Worst Generation — Test Suite");
  console.log("═══════════════════════════════════════");

  await testAuth();
  if (!testUserId) {
    console.log("\n❌ Auth failed — cannot run further tests.");
    process.exit(1);
  }

  await testHabits();
  await testPublicFeed();
  await testGroups();
  await testFollows();
  await testRLS();

  // ─── Summary ───────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);

  console.log("\n═══════════════════════════════════════");
  console.log(`  Results: ${passed}/${results.length} passed`);
  if (failed.length > 0) {
    console.log("\n  Failed tests:");
    failed.forEach((r) => console.log(`  ❌ ${r.name}\n     ${r.detail}`));
  }
  console.log("═══════════════════════════════════════\n");

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
