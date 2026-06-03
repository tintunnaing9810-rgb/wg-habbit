# Worst Generation Fitness

A production-style pirate adventure fitness tracker built with Next.js, Tailwind CSS, Supabase, and TypeScript.
Created by Sonu - learning GitHub today!

## Stack

- Next.js App Router
- Tailwind CSS
- Supabase Auth + PostgreSQL + Realtime
- TypeScript

## Features

- Email/password signup and login
- Activity logging with server-side point calculation
- Automatic `total_points` updates through a Supabase RPC
- Milestone progression system and island map
- Real-time leaderboard using Supabase subscriptions
- Mobile-first pirate-themed dashboard UI

## Project structure

```text
.
|-- app
|   |-- (auth)
|   |   |-- login/page.tsx
|   |   `-- signup/page.tsx
|   |-- (protected)
|   |   |-- dashboard/page.tsx
|   |   |-- leaderboard/page.tsx
|   |   |-- log/page.tsx
|   |   |-- progress/page.tsx
|   |   `-- layout.tsx
|   |-- api
|   |   |-- activities/route.ts
|   |   `-- leaderboard/route.ts
|   |-- globals.css
|   |-- layout.tsx
|   `-- page.tsx
|-- components
|-- lib
|   |-- supabase
|   |-- auth.ts
|   |-- constants.ts
|   |-- progression.ts
|   `-- utils.ts
|-- supabase
|   `-- setup.sql
`-- types
    `-- database.ts
```

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` and add your Supabase project values.

3. In Supabase SQL Editor, run [`supabase/setup.sql`](./supabase/setup.sql).

4. In Supabase Auth settings:

   - Enable email/password auth.
   - If you want immediate login after signup during local testing, disable email confirmation.

5. Start the app:

   ```bash
   npm run dev
   ```

6. Visit [http://localhost:3000](http://localhost:3000).

## Backend notes

- Point calculation only happens in the database through `public.calculate_activity_points()` and `public.log_activity()`.
- The Next.js API route at `/api/activities` validates input and then calls the RPC.
- A trigger on `auth.users` mirrors authenticated users into `public.users`.

## Validation rules

- `Running` and `Walking` require `distance_km`
- `Gym`, `Muay Thai`, and `Football` require `duration_min`
- `Push-ups`, `Pull ups`, `Sit Ups`, `Abs Workout`, and `Pull-ups` require `reps`

## Realtime leaderboard

The leaderboard page subscribes to the `users` table and refetches rankings whenever point totals change.
