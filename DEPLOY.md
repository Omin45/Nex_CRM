# Deploying ArkCRM to Render

Two repositories, three Render resources: a Spring Boot web service, a
Postgres database, and a static site for the Vite frontend. Both
repositories carry a `render.yaml`, so Render builds each one from the
blueprint in the file.

**The order matters.** The frontend needs the backend's address, and the
backend needs the frontend's address, so deploy the **backend first** and
fill the frontend's URL in afterwards.

---

## What is deployed

| | |
|---|---|
| Frontend | `https://nexcrm-frontend-18vr.onrender.com` |
| Backend | `https://nexcrm-backend-zrbq.onrender.com` |
| API | `https://nexcrm-backend-zrbq.onrender.com/api/v1` |
| Database | Render Postgres, `nexcrm-db`, region `virginia` |

The hostnames carry a suffix because Render appends one to a name that is
already taken. They are written out in the blueprints.

---

## Step 0 - let Render see your repositories

Render only sees a repository once its GitHub App is installed on your
account, and the app is installed **per repository**.

1. Render dashboard -> **Account Settings -> GitHub -> Install Render GitHub App**
2. Choose **All repositories**, or **Only select repositories** and tick
   **both** `Nex_CRM` and `Nex_CRM-Backend`.
3. Back on the account page, both repositories should show a connected tick.

> The backend repository is private. If you only tick the public frontend,
> Render will not list the backend and you cannot deploy it.

---

## Step 1 - the backend and its database

Render dashboard -> **New -> Blueprint** -> pick `Omin45/Nex_CRM-Backend` ->
**Apply**.

The blueprint creates `nexcrm-backend` (the web service) and `nexcrm-db`
(the database), and wires the database into the service. It also generates
`JWT_SECRET` for you.

**Two things to get right in the blueprint**, both of which cost an
afternoon to find:

```yaml
    # Render's default for a new web service is a paid plan, and it asks
    # for payment details before it will build. The free plan does not.
    plan: free

    # The same region as the database. Render only hands out an internal
    # connection string for a database in the same region; across regions
    # it is empty, and the application then waits forever for a database
    # it cannot reach.
    region: virginia
```

And the database has to be in that region too:

```yaml
databases:
  - name: nexcrm-db
    plan: free
    region: virginia
```

### The JDBC URL

The application assembles the URL from its parts rather than taking a
connection string whole:

```yaml
    url: jdbc:${DB_SCHEME:postgresql}://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:nexcrm}
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:postgres}
```

> **A JDBC URL that carries `user:password` in front of the host is not
> read correctly by the Postgres driver.** It takes the whole authority as
> the hostname and fails to resolve it, which looks like an application
> that hangs rather than a connection error. The user and the password
> belong in their own settings, and then the host is read cleanly.

`DB_SCHEME` is a variable so the same build speaks to the local MySQL and
to the hosted Postgres. The local settings live in `.env.properties`, which
is not committed.

### What happens to the database

`ddl-auto: update` means Hibernate creates the schema on the first boot, and
`DataSeeder` fills it with the demo business, its people and its ledger. So
a fresh database is not empty - it arrives ready to sign in to.

---

## Step 2 - the frontend

Render dashboard -> **New -> Blueprint** -> pick `Omin45/Nex_CRM` -> **Apply**.

```yaml
    envVars:
      - key: VITE_USE_MOCKS
        value: "false"
      - key: VITE_API_BASE_URL
        value: https://nexcrm-backend-zrbq.onrender.com/api/v1
      - key: VITE_SOCKET_URL
        value: wss://nexcrm-backend-zrbq.onrender.com/ws
```

`VITE_USE_MOCKS` must be "false". Left unset it defaults to true, and the
site would serve in-browser fixtures and never call the API at all.

The blueprint also rewrites every path to `index.html`. Without it, a
refresh on `/vendor/VND-0001/dashboard` is a 404, because the router lives
in the browser.

---

## Step 3 - point the backend's CORS at the frontend

Set `CORS_ALLOWED_ORIGINS` on the backend to the frontend's URL:

```
https://nexcrm-frontend-18vr.onrender.com
```

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
is pointing at the wrong backend: check `VITE_API_BASE_URL`.

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
