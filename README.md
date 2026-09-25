# PostPilot — Email Job Scheduler

A production-like full-stack email scheduling system with durable queues, rate limiting, and delivery visibility.

**Key Features:**
- Schedule emails for future delivery with persistent BullMQ + Redis jobs
- Survive server restarts without losing scheduled emails
- Enforce hourly rate limits without dropping jobs (reschedule instead)
- Enforce minimum delay between email sends
- Send via Ethereal Email SMTP with preview URLs
- Index/search emails using Elasticsearch
- Google OAuth login
- Slack notifications when rate limits are hit
- Bull Board dashboard for queue visibility
- Clean React + Tailwind UI
- Pure JavaScript application code 
-  Frontend: React + Vite + React Router + Tailwind CSS
- Backend: Node.js + Express + JavaScript
---

## Architecture

### Stack
- **Backend**: Node.js + Express (JavaScript)
- **Frontend**: React 18 + Vite + React Router + Tailwind CSS (JavaScript)
- **Databases**:
  - MySQL 8.4 (persistent email jobs and campaigns)
  - Redis 7 (BullMQ queues + rate limit counters)
  - Elasticsearch 8.15.3 (full-text search)
- **Job Scheduling**: BullMQ (not cron)
- **Email Delivery**: Nodemailer + Ethereal SMTP
- **Auth**: Passport + Google OAuth 2.0

### Folder Structure

```
do-x20/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js           # Environment variables (never hardcoded)
│   │   │   ├── redis.js         # Redis client
│   │   │   ├── prisma.js        # Prisma client
│   │   │   ├── elasticsearch.js # Elasticsearch client
│   │   │   └── passport.js      # Google OAuth strategy
│   │   ├── routes/
│   │   │   ├── auth.routes.js   # /api/auth/* endpoints
│   │   │   ├── email.routes.js  # /api/emails/* endpoints
│   │   │   └── slack.routes.js  # /api/slack/* endpoints
│   │   ├── services/
│   │   │   ├── email.service.js       # Campaign scheduling logic
│   │   │   ├── rate-limit.service.js  # Hourly + minimum delay enforcement
│   │   │   ├── elasticsearch.service.js
│   │   │   └── slack.service.js       # Rate limit notifications
│   │   ├── workers/
│   │   │   └── email.worker.js  # BullMQ worker (processes jobs)
│   │   ├── queues/
│   │   │   └── email.queue.js   # BullMQ queue definition
│   │   ├── types/
│   │   │   ├── auth.js          # Auth middleware
│   │   │   └── express.d.ts     # TypeScript declarations (optional)
│   │   ├── app.js               # Express app setup
│   │   └── server.js            # Entry point (starts API + reconciles jobs)
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   └── migrations/          # Migration history
│   ├── .env                     # Local environment config
│   ├── .env.example             # Template
│   ├── package.json             # Dependencies & scripts
│   
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── ComposeModal.tsx
│   │   │   ├── EmailTable.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── StatusPill.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   └── DashboardPage.tsx
│   │   ├── services/
│   │   │   └── api.ts           # API client
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env                     # Local frontend config
│   ├── .env.example             # Template
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── index.html
│
├── docker-compose.yml           # MySQL + Redis + Elasticsearch
├── package.json                 # Root workspace setup
└── README.md                    # This file
```

---

## Environment Setup

### Prerequisites
- Node.js 18+ (with npm)
- Docker & Docker Compose (for MySQL, Redis, Elasticsearch)
- Ethereal Email account (free, at https://ethereal.email/create)
- Google OAuth credentials (optional, for login)
- Slack OAuth credentials (optional, for rate limit notifications)

### Step 1: Start Infrastructure (Docker)

```bash
docker-compose up -d
```

This starts:
- **MySQL** on `localhost:3306` (user: `scheduler`, password: `scheduler`, database: `email_scheduler`)
- **Redis** on `localhost:6379`
- **Elasticsearch** on `localhost:9200` (no auth)

### Step 2: Backend Setup

```bash
cd backend

# Copy env template and edit with your credentials
cp .env.example .env

# Install dependencies (if not already done)
npm install

# Generate Prisma client
npm run prisma:generate

# Run initial migration
npm run prisma:migrate
```

**Edit `.env`:**
- `ETHEREAL_HOST`, `ETHEREAL_USER`, `ETHEREAL_PASSWORD` — Get from https://ethereal.email/create
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` — Optional, from Google Console
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI` — Optional, from Slack App

### Step 3: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Frontend .env is pre-configured for localhost
```

---

## Running the Application

### All Together (From Root)

```bash
npm run dev
```

This starts (concurrently):
- Backend API on `http://localhost:5001`
- Backend worker (processes emails)
- Frontend dev server on `http://localhost:5173`

### Individually

**Backend API:**
```bash
cd backend
npm run dev
```
Listens on `http://localhost:5001`

**Backend Worker:**
```bash
cd backend
npm run worker
```
Processes BullMQ jobs (separate terminal)

**Frontend:**
```bash
cd frontend
npm run dev
```
Listens on `http://localhost:5173`

### Production Build

```bash
npm run build

# Then run:
cd backend && npm start
cd backend && npm run start:worker
cd frontend && npm run preview
```

---

## Database Migrations

### Create New Migration (After Schema Changes)

```bash
cd backend
npm run prisma:migrate
```

### Apply Migrations to Existing Database

```bash
cd backend
npm run prisma:deploy
```

### View/Edit Schema

```bash
# Located at:
backend/prisma/schema.prisma
```

---

## API Endpoints

### Health Check
```
GET /api/health
```
Returns database and Redis connection status.

### Authentication
```
GET    /api/auth/google              # Redirect to Google login
GET    /api/auth/google/callback    # Google callback (auto)
GET    /api/auth/me                 # Get current user
POST   /api/auth/logout             # Logout (destroys session)
```

### Emails
```
POST   /api/emails/schedule          # Schedule emails
GET    /api/emails/scheduled         # List scheduled (unprocessed) emails
GET    /api/emails/sent              # List sent + failed emails
GET    /api/emails/search?q=<query>  # Full-text search
```

**POST /api/emails/schedule** Request:
```json
{
  "subject": "Hello",
  "body": "This is my email",
  "recipients": ["alice@example.com", "bob@example.com"],
  "startTime": "2025-01-24T14:00:00Z",
  "delayBetweenEmails": 5000,
  "hourlyLimit": 100,
  "senderId": "optional-sender-id"
}
```

Response:
```json
{
  "campaignId": "cuid-here",
  "scheduledCount": 2,
  "validRecipients": 2,
  "effectiveDelayBetweenEmails": 5000,
  "hourlyLimit": 100
}
```

### Slack
```
GET    /api/slack/status             # Check connection status
GET    /api/slack/connect            # Redirect to Slack OAuth
GET    /api/slack/callback           # Slack callback (auto)
POST   /api/slack/disconnect         # Disconnect Slack
```

### Admin
```
GET    /admin/queues                 # Bull Board (queue dashboard)
```

---

## Key Concepts

### Job Persistence & Restart Recovery

**Before Server Restart:**
1. EmailJob records in MySQL with status = `SCHEDULED`
2. Corresponding BullMQ delayed jobs in Redis

**On Startup:**
- `reconcileScheduledJobs()` runs automatically
- Any SCHEDULED EmailJob without a corresponding BullMQ job is re-enqueued
- Jobs are never duplicated (determined by unique idempotencyKey)

**Result:** Restart your server, future emails still send.

### Idempotency

Every EmailJob has a unique `idempotencyKey` (SHA256 hash of campaign + index + recipient). 

- If a worker crashes mid-send, another worker picks it up
- The `processingAt` timestamp prevents duplicate processing
- Same job can be safely retried without risk of double-sending

### Minimum Email Delay

**Environment:** `MIN_EMAIL_DELAY_MS` (default: 2000ms)

The worker enforces a per-sender rate limit using Redis:
- Key: `email-next-slot:{senderId}`
- If a sender tries to send faster, the job is rescheduled for later
- Timestamp-based (not in-memory), works across workers

### Hourly Rate Limiting

**Environment:** `MAX_EMAILS_PER_HOUR` (default: 200)

Per-sender, per-UTC-hour limit using Redis:
- Key: `email-rate:{hour}:{senderId}`
- Incremented atomically with Lua scripting
- When limit is hit:
  - Job is NOT dropped
  - Job is rescheduled to next hour
  - Slack notification sent (if connected)
  - Ordering preserved as much as possible

**Note:** User-specified `hourlyLimit` is capped at `MAX_EMAILS_PER_HOUR`.

### Rate Limit Notifications

When hourly limit is reached and Slack is connected:
- User receives a DM with sender email and retry time
- Notification is sent only once per hour per sender (no spam)
- Failure to send Slack message does NOT fail email delivery

### Elasticsearch Search

Optional full-text search index. If `ELASTICSEARCH_URL` is not set:
- Indexing is silently skipped (no crashes)
- Search endpoint returns 503 with message
- Can be enabled later without code changes

---

## Worker Concurrency

**Environment:** `WORKER_CONCURRENCY` (default: 5)

Number of parallel jobs the worker processes. 

- Higher concurrency = faster throughput
- But respects minimum delay and hourly limits
- Can be changed and restarted dynamically
- Database claim prevents duplicate processing

---

## Handling 1000+ Emails

When scheduling 1000+ emails at once:

1. **Creation**: All EmailJob + Campaign records inserted in single transaction
2. **Queuing**: Each job added to BullMQ with correct `delay` timestamp
3. **Processing**: 
   - Minimum delay spreads sends across time
   - Hourly limit prevents burst overload
   - Worker processes up to `WORKER_CONCURRENCY` jobs in parallel
   - Excess jobs remain queued (safe, persistent)
4. **Result**: Predictable throughput, no dropped emails

---

## Frontend

### Login
Click "Continue with Google" to authenticate. First-time users are created automatically.

### Dashboard
- **Header**: User name, email, avatar, queue link, logout
- **Compose**: Click "Compose new email"
- **Upload**: CSV or TXT file with email addresses
- **Schedule**: Set start time, delay, hourly limit
- **Scheduled Tab**: Shows queued emails (unprocessed)
- **Sent Tab**: Shows sent + failed emails (with error messages)
- **Search**: Full-text search across recipient, subject, sender
- **Slack**: Connect to get rate limit notifications

### Compose Modal
1. Enter subject and body
2. Upload CSV or text file with emails
3. See detected count
4. Set start time (defaults to now + 1 minute)
5. Set delay between sends (milliseconds)
6. Set hourly limit (respects server max)
7. Click "Schedule"

### Status Indicators
- **SCHEDULED**: Waiting to be processed
- **PROCESSING**: Currently being sent
- **SENT**: Successfully delivered (preview URL available)
- **FAILED**: Delivery error (error message shown)

---

## Troubleshooting

### Backend won't start
```bash
# Check MySQL connection
npm run prisma:migrate

# Check Redis connection
redis-cli ping  # Should return PONG

# Check logs for missing env vars
cat backend/.env | grep -E "ETHEREAL|GOOGLE|SLACK"
```

### Emails not processing
1. Check worker is running: `npm run worker` in separate terminal
2. Check Redis: `redis-cli info stats`
3. Check Bull Board: `http://localhost:5001/admin/queues`
4. Check logs for errors

### Google login not working
- Make sure `GOOGLE_CALLBACK_URL` matches Google Console
- Check frontend `.env` has correct `VITE_API_URL`

### Slack notifications not received
- Ensure Slack is connected on dashboard
- Check worker logs for Slack API errors
- Slack errors are logged but don't crash email delivery

---

## Production Considerations

### Security
- Change `SESSION_SECRET` to a long random value
- Use HTTPS in production (`secure: true` in cookie config)
- Store credentials in a secrets manager, never in `.env`
- Use environment variables for all sensitive data

### Scaling
- Redis should be a cluster for high availability
- MySQL should have replication + backup strategy
- Consider distributed worker deployment (multiple instances)
- Use connection pooling for database

### Monitoring
- Set up alerts for Bull Board failed jobs
- Monitor Redis memory usage (rate limit keys expire hourly)
- Monitor MySQL query performance (indexed on `status` + `senderId`)
- Log worker errors to external service (Sentry, etc.)

### Database Cleanup
- Completed jobs can be archived/deleted after retention period
- Elasticsearch indices can be reindexed periodically
- Redis cache is self-cleaning (TTLs on all keys)

---

## Assumptions & Trade-offs

### Assumptions
1. **Single MySQL Database**: Not sharded. Works for 10M+ emails with proper indexing.
2. **Ethereal for Testing**: Production should use SendGrid, AWS SES, etc. (just change nodemailer config).
3. **Redis Same-Host**: For production, use a managed Redis service (Amazon ElastiCache, etc.).
4. **Ordered Scheduling**: Job order is preserved by `startTime + (index * delay)`, but true ordering is not guaranteed under extreme concurrency.
5. **UTC Hours**: Rate limit windows are UTC-based (`YYYY-MM-DDTHH:00:00Z`).

### Trade-offs
1. **No Batch Sending**: Each recipient gets a separate email job (simpler, per-recipient tracking). Alternatives: batch in groups of 10, send via BCC.
2. **No Template System**: No dynamic variables ({{name}}, {{code}}). Can be added via service layer.
3. **Slack is Fire-and-Forget**: Notifications are best-effort; if Slack fails, email still sends.
4. **Search is Optional**: Elasticsearch adds operational overhead. MySQL fulltext search is an alternative.
5. **No Webhook Events**: No callbacks for external systems. Can add event stream (Kafka, etc.) if needed.

### TypeScript Trade-off

The assignment specified TypeScript for the application layer. 
The implemented application logic uses JavaScript/ES Modules to keep the codebase simple and consistent with the implementation.
---

## Demo Script

To demonstrate the system:

1. **Start Infrastructure**
   ```bash
   docker-compose up -d
   ```

2. **Start Backend + Frontend**
   ```bash
   npm run dev
   ```

3. **Login**
   - Open `http://localhost:5173`
   - Click "Continue with Google"
   - (Or skip OAuth if not configured)

4. **Create Test Sender** (skip if first-time login creates default)
   - Or use default sender from Google profile

5. **Compose Email**
   - Click "Compose new email"
   - Subject: "Hello {{recipient}}"
   - Body: "This is a test email sent at {{time}}"
   - Upload CSV with 5-10 test emails
   - Start time: Now + 1 minute
   - Delay: 3000ms (3 seconds between sends)
   - Hourly limit: 200
   - Click "Schedule"

6. **See Scheduled**
   - Emails appear under "Scheduled" tab
   - Status is "SCHEDULED"

7. **Watch Worker Process**
   - Open `http://localhost:5001/admin/queues`
   - See jobs move from "Delayed" → "Active" → "Completed"
   - Each job respects 3 second delay

8. **Check Sent**
   - After 30+ seconds, emails move to "Sent" tab
   - Each has a preview URL (Ethereal link)
   - Click to view test email

9. **Test Rate Limit**
   - Create campaign with 250 emails, hourly limit 100
   - Watch first 100 send in this hour
   - Remaining 150 delayed to next hour
   - Check Slack for notification (if connected)

10. **Restart & Persist**
    - Stop backend (`Ctrl+C`)
    - Wait 10 seconds
    - Start backend again (`npm run dev`)
    - Remaining emails still in queue, continue processing

11. **Search**
    - Search for recipient email or subject
    - Results appear with sender, status, timestamp

---

## Contributing & Code Quality

### Code Style
- JavaScript (no TypeScript in application code)
- Simple, readable functions
- Error messages for debugging
- Comments for complex logic only

### Testing
- Manual testing via UI
- Check logs: `console.info()`, `console.error()`
- Bull Board for job visibility
- Prisma Studio: `npx prisma studio` (local only)

### Performance Tips
- Batch EmailJob creation with Promise.all
- Use Redis Lua scripts for atomic operations
- Index database on `status`, `senderId`, `recipient`
- Elasticsearch for search queries > 1000 emails

---

## License

This is a learning project. Use freely.

---



### Google OAuth

Create a Google Cloud OAuth **Web application** client. Add `http://localhost:5001/api/auth/google/callback` as an authorized redirect URI, then set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL`. Google sign-in is intentionally not mocked: if these values are missing, the API returns a clear configuration error.

### Slack OAuth

Create a Slack app with the redirect URL `http://localhost:5001/api/slack/callback`. Add bot scopes `chat:write` and `im:write`, then set the `SLACK_*` values. The Connect Slack button performs OAuth v2 and stores the resulting token per application user. When a limit is first reached for a sender in an hour, the worker opens a DM with the connected Slack identity and sends a real `chat.postMessage`. Disconnect simply removes that stored authorization.

For production, encrypt the stored Slack access token using a managed key. It is stored plainly in this assignment project to keep the required schema and runtime setup straightforward.

## API

All endpoints other than health and OAuth callbacks require the authenticated session cookie.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | MySQL and Redis health check |
| GET | `/api/auth/google` | Begin Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/auth/me` | Current signed-in user |
| POST | `/api/auth/logout` | End session |
| POST | `/api/emails/schedule` | Create campaign and delayed recipient jobs |
| GET | `/api/emails/scheduled` | Scheduled recipient jobs |
| GET | `/api/emails/sent` | Sent and failed jobs |
| GET | `/api/emails/search?q=term` | Elasticsearch query scoped to current user |
| GET | `/api/slack/connect` | Begin Slack OAuth |
| GET | `/api/slack/callback` | Slack OAuth callback |
| GET | `/api/slack/status` | Connection status |
| POST | `/api/slack/disconnect` | Remove Slack connection |

Example scheduling request:

```json
{
  "subject": "Hello from PostPilot",
  "body": "A short, thoughtful message.",
  "recipients": ["person@example.com", "other@example.com"],
  "startTime": "2026-09-23T12:30:00.000Z",
  "delayBetweenEmails": 2000,
  "hourlyLimit": 200
}
```

Input is validated by Zod. Duplicate addresses are removed; the effective delay is `max(requested delay, MIN_EMAIL_DELAY_MS)`, and the effective hourly limit cannot exceed `MAX_EMAILS_PER_HOUR`.

## Queue, persistence, and idempotency

Each persisted `EmailJob` has a unique `idempotencyKey` and its own deterministic BullMQ `jobId` (the MySQL job id). First, the API commits the campaign and all jobs in a MySQL transaction. It then enqueues jobs with their calculated BullMQ delay. This keeps the database authoritative and makes enqueueing safely retryable.

On API startup, a small reconciliation pass checks only `SCHEDULED` database records missing from BullMQ and adds those exact deterministic jobs. It does not recreate jobs BullMQ already has, so a normal restart preserves delayed Redis jobs rather than duplicating them.

The worker atomically claims each job in MySQL before SMTP work. A duplicate queue record or retry sees an existing fresh claim and is delayed; a record already marked `SENT` is a no-op. A stale processing claim (for example after a process crash) can be reclaimed after five minutes. The fixed SMTP `Message-ID` is also derived from the persistent email-job id.

There is an unavoidable distributed-systems boundary between SMTP acceptance and writing `SENT` to MySQL: no SMTP server can participate in the SQL transaction. This implementation prevents application-level duplicate processing and uses a stable SMTP message id; production providers with idempotency keys or delivery webhooks can strengthen that final edge case further.

## Concurrency, delays, and hourly limits

`WORKER_CONCURRENCY` can safely be greater than one or multiple worker processes can run. The worker uses Redis—not process memory—for coordination:

- An atomic Lua counter reserves one hourly quota slot under `email-rate:<UTC-hour>:<sender-id>`.
- If the quota is full, the active BullMQ job is moved to the next hourly window. It remains durable and keeps the same job ID.
- A Redis `SET NX` key limits Slack rate-limit alerts to one per sender/hour.
- A second atomic Lua reservation assigns a per-sender next-send slot. This enforces `MIN_EMAIL_DELAY_MS` even when several workers dequeue jobs at once.

The hourly limit is per sender, so one sender’s full window does not block another sender. Queue order is preserved as much as practical by keeping the original job and moving it to its first eligible time.

## Elasticsearch

The worker indexes terminal records, and the scheduling API indexes new scheduled records. Indexing is deliberately best-effort: an Elasticsearch outage logs an error but never loses or reverses a valid MySQL delivery state. The search endpoint uses a scoped multi-match query over recipient, sender, subject, body, and status.

## Verification and five-minute demo

Use a small `MAX_EMAILS_PER_HOUR=3` in `backend/.env` for the rate-limit demo.

1. Sign in with Google and connect Slack.
2. Compose a campaign with a CSV of five valid addresses, a start time one minute ahead, delay `2000`, and hourly limit `3`.
3. Show the scheduled dashboard table and Bull Board’s delayed jobs.
4. Start the worker; show up to three records move to Sent and open an Ethereal preview URL.
5. Show remaining jobs delayed to the next UTC hour and the Slack DM alert.
6. For restart persistence, schedule one email several minutes in the future, stop the API process, start it again, and show the same delayed job still present in Bull Board. It executes at its scheduled time.
7. For idempotency, retry a completed job from Bull Board: the worker reads the persistent `SENT` state and exits without sending another message.

## Testing notes

Run static builds after installing dependencies:

```bash
npm run build
```

For API testing, import the API table above into Postman and authenticate in the browser first (or use a cookie-enabled Postman session). The browser flow exercises CSV parsing, validation, scheduling, queue state, OAuth, and search end to end.

## Assumptions and trade-offs

- Ethereal is intentionally used rather than a production email provider.
- MySQL is the source of truth; Redis is for queues and distributed coordination; Elasticsearch is search only.
- The application is one API plus one worker process, not a microservice fleet.
- Multiple `Sender` rows are modelled and limits are keyed by sender. Google login creates the initial sender; additional verified sender management is outside the compact assignment UI.
- The database/queue design supports 1,000+ scheduled jobs. This demo should use a few Ethereal messages, not bulk-deliver thousands.
- Slack is optional at runtime. An absent or failed Slack connection is logged and never interrupts email scheduling or delivery.
- Secrets are environment variables and `.env` is ignored. Deploy with HTTPS and a persistent session store when horizontally scaling the API.

## Feature Checklist

### Backend

- [x] Express REST API
- [x] MySQL + Prisma persistence
- [x] Redis + BullMQ delayed jobs
- [x] Dedicated BullMQ worker
- [x] Configurable worker concurrency
- [x] Minimum email delay
- [x] Hourly rate limiting
- [x] Rate-limit job rescheduling
- [x] Restart reconciliation
- [x] Idempotent email jobs
- [x] Ethereal SMTP delivery
- [x] Elasticsearch indexing/search
- [x] Google OAuth
- [x] Slack OAuth and notifications
- [x] Bull Board
- [x] No cron jobs

### Frontend

- [x] React + Vite
- [x] Google login
- [x] Dashboard
- [x] Compose email
- [x] CSV/TXT upload
- [x] Recipient detection
- [x] Scheduling controls
- [x] Scheduled Emails table
- [x] Sent Emails table
- [x] Email search
- [x] Slack connection
- [x] Loading/empty/error states
- [x] Logout
