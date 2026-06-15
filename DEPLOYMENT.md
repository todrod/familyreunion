# Deployment Runbook

Everything you need to ship a change to the Aversa Family Reunion site safely,
plus fixes for the problems we've actually hit. Read this before deploying.

## The setup at a glance

| Thing | Value |
| --- | --- |
| Live URL | https://reunion.todrod.com |
| Repo | https://github.com/todrod/familyreunion (push to `main` deploys) |
| Server | VPS `srv1378469`, app dir `/var/www/familyreunion` |
| Process manager | `pm2`, app name **`family-reunion`** (runs on `127.0.0.1:3205`) |
| Web server | nginx (TLS) → proxies to the pm2 app |
| Database | MySQL/MariaDB, db `familyreunion`, **localhost-only** (not exposed) |
| Login password | `Aversa` (family-wide; in `src/lib/auth.ts`) |
| Hosting note | **Self-hosted only. NOT on Vercel.** |

## How deploying normally works

1. Commit your change and **push to `main`**.
2. GitHub Actions (`.github/workflows/deploy.yml`) SSHes into the VPS and runs:
   `git fetch + reset --hard origin/main` → `npm ci` → `npm run build` →
   `pm2 restart family-reunion` → health check. Takes ~2–5 min.
3. Watch it: https://github.com/todrod/familyreunion/actions — green check = live.

That's it for the happy path. **Do not do anything manually on the server unless
the Action fails.**

## Before you push — a 30-second checklist

- [ ] `npx tsc --noEmit` passes (no type errors).
- [ ] `npm run build` succeeds locally.
- [ ] If you added/changed a **DB column**, the app self-provisions it — see
      "Database changes" below. Don't rely on the schema already matching prod.
- [ ] **Never force-push `main`.** (See "Force-push" below — it broke every
      deploy once.) If a pushed commit is wrong, add a new commit instead.

## After you push — verify it actually deployed

The Action going green isn't proof the app works. Quick external check:

```bash
# login page should be reachable and NOT long-cached
curl -s -I https://reunion.todrod.com/ | grep -i cache-control   # expect no-store
# log in and hit a protected route + the data API
C=$(curl -s -i -X POST https://reunion.todrod.com/api/auth -H "Content-Type: application/json" -d '{"password":"Aversa"}' | grep -i set-cookie | sed -E 's/.*set-cookie: ([^;]+);.*/\1/i')
curl -s -o /dev/null -w "planning: %{http_code}\n"  -H "Cookie: $C" https://reunion.todrod.com/planning
curl -s -o /dev/null -w "families: %{http_code}\n" -H "Cookie: $C" https://reunion.todrod.com/api/families
```

All `200` = good.

---

## When the auto-deploy fails

First, **the site stays up** during a failed deploy (the old build keeps
running) — so don't panic. Find the failing step in the Actions log, then:

### 1. "SSH preflight failed" / can't reach the SSH port

Cause: the VPS's **fail2ban** temporarily banned the GitHub runner's IP after a
burst of deploy attempts. The port goes dark for that IP only.

- It usually **clears itself** in a few minutes (bans expire). Just re-run the
  failed job from the Actions page.
- To check/clear on the server:
  ```bash
  fail2ban-client status sshd        # look at "Currently banned"
  fail2ban-client unban --all        # clears all bans
  ```
- Avoid triggering it: don't fire many deploys back-to-back.

### 2. "Not possible to fast-forward" / diverging branches

Cause: the server's git history diverged from `origin/main` (almost always
because someone **force-pushed**). The deploy script now uses `reset --hard`,
so this shouldn't recur — but if you see it, reset the server checkout:

```bash
cd /var/www/familyreunion
git fetch origin main && git reset --hard FETCH_HEAD
```

### 3. Build fails on the server

Reproduce locally first (`npm run build`). If it builds locally but not on the
server, it's usually disk space (`df -h`) or a stale `.next` (the deploy already
does `rm -rf .next`).

---

## Manual deploy (when you can't wait for / fix the Action)

SSH into the VPS, then:

```bash
cd /var/www/familyreunion
git fetch origin main && git reset --hard FETCH_HEAD
git log --oneline -1                 # confirm you're on the commit you expect
rm -rf .next
npm ci --no-audit --no-fund
npm run build
pm2 restart family-reunion && pm2 save
```

This is exactly what the Action does. Watch the build summary and the pm2 line.

---

## Database changes

The DB is **localhost-only on the VPS** — you can't reach it from your laptop.
Two ways to change it:

1. **Preferred — self-provision in code.** Tables/columns are created on demand
   (see `src/lib/families.ts`, `signups.ts`, `bingo.ts`). Add your column to the
   `ensure*Schema()` function with `ADD COLUMN IF NOT EXISTS`; it applies itself
   on the next request after deploy, on any database.

2. **Direct SQL** (for a one-off / urgent fix). On the VPS:
   ```bash
   cd /var/www/familyreunion
   set -a; . ./.env.local; set +a
   mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "YOUR SQL HERE;"
   ```
   Example that fixed the "can't add names" 500 (table was missing columns):
   ```sql
   ALTER TABLE families ADD COLUMN phone VARCHAR(20) NOT NULL DEFAULT '';
   ALTER TABLE families ADD COLUMN room_number VARCHAR(10) NOT NULL DEFAULT '';
   ```

There's a SQL dump on the desktop (`familyreunion-backups/`) if you need to
recover data.

---

## Hard-won lessons (don't repeat these)

- **Never force-push `main`.** It diverges the server checkout and silently
  breaks every deploy. Add a follow-up commit instead.
- **A 500 with no detail** usually means the **DB schema is behind the code**
  (missing column). The app surfaces save failures as a toast now — check the
  server response, then check the table columns.
- **"Can't log in after a change"** was the login page being cached for a year,
  so browsers loaded HTML pointing at deleted JS bundles. The page is now
  `force-dynamic` (`src/app/page.tsx`) → served fresh. If it ever recurs, a
  hard-refresh (Ctrl+Shift+R) is the quick test.
- **The home page "changed"** because deploys had been failing, so a batch of
  already-committed work all went live at once on the next successful deploy.
  Deploy often and in small commits so changes don't pile up unseen.
- **Don't spam deploys** — it can trip fail2ban (see SSH section).
