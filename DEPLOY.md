# Deploying ArkCRM to Render

Two repositories, three Render resources: a Spring Boot web service, a MySQL
database, and a static site for the Vite frontend. Both repositories carry a
`render.yaml`, so Render builds each one from the blueprint in the file.

The order matters. The frontend needs the backend's address, and the backend
needs the frontend's address, so deploy the **backend first** and fill the
frontend's URL in afterwards.

---

## Before you start

| | |
|---|---|
| Backend repo | `Omin45/Nex_CRM-Backend` (private) |
| Frontend repo | `Omin45/Nex_CRM` (public) |
| Database | Render MySQL (free tier expires after 30 days) |

---

## Step 0 - let Render see your repositories

Render only sees a repository once its GitHub App is installed on your
account, and the app is installed **per repository**.

1. Render dashboard → **Account Settings → GitHub → Install Render GitHub App**
2. Choose **All repositories**, or **Only select repositories** and tick
   **both** `Nex_CRM` and `Nex_CRM-Backend`.
3. Back on the account page, the two repositories should both show a green
   "connected" tick.

> The backend repository is private. If you only tick the public frontend,
> Render will not list the backend and you cannot deploy it.

---

## Step 1 - the backend and its database

Render dashboard → **New → Blueprint** → pick `Omin45/Nex_CRM-Backend` →
**Apply**.

The blueprint creates two resources:

- `nexcrm-backend` - the Spring Boot web service
- `nexcrm-db` - the MySQL database

Render wires the database into the service by itself: `DB_HOST`, `DB_PORT`,
`DB_NAME`, `DB_USERNAME` and `DB_PASSWORD` all come from the database. It
also generates `JWT_SECRET` fresh - that key signs the access tokens, so do
not copy it anywhere or the sessions break.

Render will ask for one value you have to supply:

| Variable | What to put |
|---|---|
| `CORS_ALLOWED_ORIGINS` | `https://nexcrm-frontend.onrender.com` |

If the frontend does not exist yet, put that address in anyway - it is the
name the blueprint gives the site - and correct it in step 3 if the name
comes out different.

**The build takes a few minutes.** It runs `mvn -B clean package -DskipTests`
and starts `java -jar target/Backend-0.0.1-SNAPSHOT.jar`.

> The `mvnw` wrapper in this repository is missing its properties file and
> cannot run. The blueprint deliberately uses the system `mvn` that Render
> installs.

### What happens to the database

`ddl-auto: update` means Hibernate creates the schema on the first boot, and
`DataSeeder` fills it with the demo business, its people and its ledger. So
a fresh database is not empty - it arrives ready to sign in to.

---

## Step 2 - the frontend

Render dashboard → **New → Blueprint** → pick `Omin45/Nex_CRM` → set two
variables → **Apply**.

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://nexcrm-backend.onrender.com/api/v1` |
| `VITE_SOCKET_URL` | `wss://nexcrm-backend.onrender.com/ws` |

`VITE_USE_MOCKS=false` is already in the blueprint. It has to be false:
left unset it defaults to true, and the site would serve in-browser fixtures
and never call the API at all.

> `VITE_` variables are baked into the bundle at **build** time. Editing one
> in Render triggers a rebuild, which takes a couple of minutes. That is
> Render doing you a favour - it redeploys the site for you.

The blueprint also rewrites every path to `index.html`. Without it, a
refresh on `/vendor/VND-0001/dashboard` is a 404, because the router lives in
the browser and the server has no such file.

---

## Step 3 - point the backend's CORS at the frontend

Copy the frontend's URL from the Render dashboard (it is on the static
site's page) and set it on the backend service:

`CORS_ALLOWED_ORIGINS` = `https://nexcrm-frontend.onrender.com`

Save. The backend redeploys.

The origin is exact: scheme, host, no trailing slash, no path. A trailing
slash is the most common reason for a CORS failure that looks like
everything else working.

---

## Step 4 - check it

1. Open the frontend URL. The marketing site loads.
2. Go to `/login` and sign in with `manager@nexcrm.com` / `Kingsley@2026`.
3. The dashboard loads, with figures from the database - not empty states.

If the page loads but every panel says it cannot load the data, the frontend
is pointing at the wrong backend: check `VITE_API_BASE_URL` and wait for the
rebuild.

If the browser console shows a CORS error, the backend's
`CORS_ALLOWED_ORIGINS` does not match the frontend's origin exactly.

---

## Signing in

The seeded accounts, one per role. Each has its own password - they are
`<FirstName>@2026`.

| Account | Role |
|---|---|
| `admin@nexcrm.com` / `Omashola@2026` | Platform Administrator |
| `manager@nexcrm.com` / `Kingsley@2026` | Workspace Administrator |
| `sales.manager@nexcrm.com` / `Chinenye@2026` | Sales Manager |
| `finance.manager@nexcrm.com` / `Bola@2026` | Finance Manager |
| `sales.agent@nexcrm.com` / `Chidi@2026` | Sales Agent |
| `accountant@nexcrm.com` / `Emeka@2026` | Accountant |
| `support.manager@nexcrm.com` / `Halima@2026` | Support Manager |
| `support.agent@nexcrm.com` / `Ifeoma@2026` | Support Agent |
| `staff.manager@nexcrm.com` / `Daniel@2026` | Manager |
| `customer@nexcrm.com` / `Grace@2026` | Customer |

The demo business is **Meridian Systems Nigeria**, join code `MER-0001`.
Settings -> Team shows it, with a copy button.

---

## The two things that will bite you

**The free service sleeps.** After about fifteen minutes with no traffic,
Render parks the instance. The next request takes roughly fifty seconds
while it wakes up. For a demonstration, that is a long silence in front of
people. A paid instance does not sleep.

**The free database expires after 30 days.** When it goes, the service loses
its data and the schema is rebuilt from scratch on the next boot - so the
app looks fine and every record is gone. For anything longer-lived, point
`DB_HOST` and friends at a database that stays.

---

## Deploying a change

Push to `main` and Render redeploys on its own. The backend rebuilds and
restarts; the frontend rebuilds the bundle.

If you changed a `VITE_` variable, the new value needs a rebuild - Render
does that when you save the variable, but a plain `git push` does not
rebuild the frontend, because the value is baked in at build time.
