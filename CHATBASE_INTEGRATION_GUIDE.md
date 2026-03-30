# Chatbase Integration Guide

## Overview
Your system uses **Chatbase** as the chatbot platform and syncs conversation data to a local MySQL database (RDS) for analytics and dashboard display.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Chatbase Platform                       │
│                   (chatbase.co/api/v1/)                      │
│  - Stores all user conversations with the chatbot            │
│  - Provides API to retrieve chat history                     │
│  - Authentication via API Key                                │
└────────────────────────┬────────────────────────────────────┘
                         │ 
                         │ getChatbotConversations()
                         │ Uses CHATBASE_API_KEY
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│        Backend Lambda / Scheduled Ingest Script              │
│   (backend/scripts/lambda/chatbot-conv-to-rds-ingest.js)    │
│                                                               │
│  1. Polls Chatbase API for new conversations                │
│  2. Transforms raw Chatbase data                             │
│  3. Extracts leads, products, recommendations                │
│  4. Stores normalized data in MySQL                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ INSERT / UPDATE
                         │ Normalized data
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              MySQL Database (RDS)                             │
│  - conversations table                                        │
│  - messages table                                             │
│  - leads table                                                │
│  - products_recommended table                                │
│  - products_clicked table                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Query data
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│      Backend Express Server (port 4000)                      │
│  - /api/conversations (GET)                                  │
│  - /api/conversations/:id (GET)                              │
│  - /api/leads (GET)                                          │
│  - /api/analyze (POST - run analytics)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ JSON responses
                         │ (with JWT auth)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│      React Frontend Dashboard (port 5173)                    │
│  - LiveDashboard (real-time conversations)                  │
│  - AnalyticsDashboard (charts & insights)                   │
│  - LeadsPage (captured leads)                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Chatbase API Setup

### Required Environment Variables

**Backend** (`backend/.env`):
```env
CHATBASE_API_KEY=<your-chatbase-api-key>
CHATBOT_ID=<your-chatbot-id>
CHATBOT_BASE_URL=https://www.chatbase.co  # Optional, defaults to this
```

**Frontend** (`frontend/.env`):
```env
VITE_PROVIDER_GLOBAL_KEY=chatbase  # Identifies the provider
```

### How to Get Your Keys

1. Go to [Chatbase Dashboard](https://chatbase.co)
2. Create/Select your chatbot
3. Go to **Settings → API Keys**
4. Copy your **API Key** and **Chatbot ID**
5. Add them to `backend/.env`

---

## Step 2: Data Ingestion Pipeline

### How Data Flows from Chatbase → MySQL

**File**: [`backend/scripts/lambda/chatbot-conv-to-rds-ingest.js`](backend/scripts/lambda/chatbot-conv-to-rds-ingest.js)

This script:
1. **Fetches** conversations from Chatbase API
2. **Transforms** raw data into normalized format
3. **Extracts** structured data (leads, products, tools used)
4. **Stores** in MySQL database

#### API Call to Chatbase

```javascript
async function getChatbotConversations({ chatbotId, apiKey, size, page }) {
  const base = "https://www.chatbase.co";
  const url = `${base}/api/v1/get-conversations?chatbotId=${chatbotId}&size=${size}&page=${page}`;
  
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,  // ← Uses your API key
    },
  });
  
  return res.json();  // Returns: { conversations: [...], hasMore: bool, ... }
}
```

#### Data Structure Transformation

**Raw Chatbase Response**:
```json
{
  "conversations": [
    {
      "id": "conv-123",
      "createdAt": "2026-03-24T10:00:00Z",
      "messages": [
        {
          "role": "user",
          "content": "Can I buy this product?",
          "createdAt": "2026-03-24T10:00:00Z"
        },
        {
          "role": "assistant",
          "content": "Yes, check this: https://example.com/product-123"
        }
      ]
    }
  ]
}
```

**Normalized Storage in MySQL**:
```sql
-- conversations table
INSERT INTO conversation (
  id, started_at, ended_at, message_count, tool_name, visitor_email
) VALUES (
  'conv-123', '2026-03-24 10:00:00', NULL, 2, 'Collect_Leads', 'user@example.com'
);

-- messages table
INSERT INTO message (
  conversation_id, role, content, created_at
) VALUES (
  'conv-123', 'user', 'Can I buy this product?', '2026-03-24 10:00:00'
);

-- products_clicked table (extracted from URLs)
INSERT INTO product_clicked (
  conversation_id, visitor_id, product_name, product_url, clicked_at
) VALUES (
  'conv-123', 'visitor-uuid', 'product-123', 'https://example.com/product-123', '2026-03-24 10:00:00'
);
```

### Running the Ingest Script

**Manually ingest**:
```bash
cd backend
npm run ingest-rds
```

**In production**, this typically runs:
- As an **AWS Lambda** function on a schedule (e.g., every 5 minutes)
- Or as a **Cron job** using `node-cron`

---

## Step 3: Backend API Routes

Your backend exposes these endpoints that query the MySQL database:

### Get All Conversations
```
GET /api/conversations?size=100&from=2026-03-01&to=2026-03-31
```

**Code**: [`backend/index.js` line 447](backend/index.js#L447)

```javascript
app.get("/api/conversations", requireAuth, userLimiter, async (req, res) => {
  const { size, from, to } = req.query;
  
  // Queries MySQL (NOT Chatbase directly)
  const data = await getConversationsFromRds({ 
    limit: size, 
    fromDate: from, 
    toDate: to 
  });
  
  res.json(data);
});
```

### Get Single Conversation with Messages
```
GET /api/conversations/conv-123
```

**Code**: [`backend/index.js` line 483](backend/index.js#L483)

```javascript
app.get("/api/conversations/:id", requireAuth, userLimiter, async (req, res) => {
  const conversation = await getConversationByIdFromRds(req.params.id);
  res.json(conversation);
});
```

### Get Leads (Captured Contact Info)
```
GET /api/leads?size=100&from=2026-03-01&to=2026-03-31
```

**Code**: [`backend/index.js` line 499](backend/index.js#L499)

---

## Step 4: Frontend Data Flow

### How Frontend Fetches Data

**File**: [`frontend/src/api.js`](frontend/src/api.js#L1-L50)

```javascript
export const BASE_URL = import.meta.env.DEV 
  ? "http://localhost:4000"           // Development
  : "https://your-domain.com";        // Production

export async function getConversations(size, fromDate, toDate) {
  const res = await fetch(
    `${BASE_URL}/api/conversations?size=${size}&from=${fromDate}&to=${toDate}`,
    {
      method: "GET",
      headers: getAuthHeaders()  // ← Includes JWT token
    }
  );
  return res.json();
}
```

### Data Caching

**File**: [`frontend/src/contexts/DataCacheContext.jsx`](frontend/src/contexts/DataCacheContext.jsx)

Frontend caches data to avoid redundant API calls:

```javascript
export function DataCacheProvider({ children, dateFilter }) {
  const [cachedData, setCachedData] = useState({
    conversations: [],        // Cached from /api/conversations
    report: null,            // Analytics summary
    aiClusters: null,        // Question clustering
    topRecommendedProducts: [],  // From /api/top-recommended-products
  });

  const fetchConversations = useCallback(async (force = false) => {
    // Skip if already cached (unless forced)
    if (!force && cachedData.conversations.length > 0) {
      console.log("Using cached conversations");
      return;
    }

    const data = await getConversations();
    setCachedData(prev => ({
      ...prev,
      conversations: data
    }));
  }, []);

  return (
    <DataCacheContext.Provider value={{ conversations, fetchConversations }}>
      {children}
    </DataCacheContext.Provider>
  );
}
```

---

## Step 5: Data Normalization

### Filtering Tool Messages

Chatbase API returns internal tool messages that clutter the UI. Your code filters them:

**File**: [`frontend/src/mapConversation.js`](frontend/src/mapConversation.js)

```javascript
function normalizeMessage(m) {
  // Filter out tool role messages
  if (m.role === "tool") return null;

  // Filter out array content (tool calls and results)
  if (Array.isArray(m.content)) return null;

  // Filter out stringified tool call arrays
  if (typeof m.content === "string") {
    const trimmed = m.content.trim();
    if (trimmed.startsWith("[") && trimmed.includes("tool-call")) {
      return null;  // Skip tool messages
    }
  }

  // Return clean message
  return {
    role: m.role,
    text: m.content,
    createdAt: m.createdAt,
    sources: extractSourceNames(m.matchedSources)
  };
}
```

---

## Step 6: Real-Time Updates

### Live Sync Button

**File**: [`frontend/src/pages/LiveDashboard.jsx`](frontend/src/pages/LiveDashboard.jsx#L1-L80)

```javascript
export default function LiveDashboard() {
  const { refetchConversations } = useDataCache();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      // Force refresh from Chatbase → MySQL → API
      await refetchConversations(true);  // true = skip cache
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button onClick={handleSync} disabled={syncing}>
      {syncing ? "Syncing..." : "Sync Now"}
    </button>
  );
}
```

---

## Complete Data Flow Summary

1. **Chatbase** stores all conversations
2. **Lambda/Cron** (every 5 min) → Fetch new convs from Chatbase API
3. **Transform** → Extract leads, products, tools
4. **MySQL** → Store normalized data
5. **Backend API** → Query MySQL, return JSON
6. **Frontend** → Fetch from Backend API, cache locally
7. **React Components** → Render conversations, charts, analytics

---

## Environment Variables Required

### Backend

```bash
# Chatbase Integration
CHATBASE_API_KEY=sk_...          # From Chatbase dashboard
CHATBOT_ID=your-bot-id           # From Chatbase dashboard

# Database
RDS_HOST=your-database.rds.amazonaws.com
RDS_USER=admin
RDS_PASSWORD=your-password
RDS_DATABASE=chatbot_db
RDS_PORT=3306

# Authentication
ACCESS_TOKEN_SECRET=your-secret-key

# Optional
CHATBOT_BASE_URL=https://www.chatbase.co  # Defaults to this
NODE_ENV=production
```

### Frontend

```bash
VITE_PROVIDER_GLOBAL_KEY=chatbase
```

---

## Common Workflows

### Add a New Chatbase Integration

1. Get API key + Chatbot ID from Chatbase
2. Add to `backend/.env`
3. Run: `npm run setup-rds` (creates MySQL tables)
4. Run: `npm run ingest-rds` (syncs existing conversations)
5. Schedule Lambda/Cron to run ingest every 5 minutes

### View Conversations in Frontend

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Login to dashboard
4. Click "Sync Now" to fetch latest from Chatbase

### Query Conversations Directly from MySQL

```sql
-- Get all conversations
SELECT * FROM conversation LIMIT 10;

-- Get messages for a specific conversation
SELECT * FROM message 
WHERE conversation_id = 'conv-123'
ORDER BY created_at;

-- Get all leads captured
SELECT * FROM lead WHERE email IS NOT NULL;
```

---

## Troubleshooting

### Conversations Not Appearing

**Check**:
1. Is `CHATBASE_API_KEY` valid? Test via Postman:
   ```bash
   curl -H "Authorization: Bearer YOUR_KEY" \
     "https://www.chatbase.co/api/v1/get-conversations?chatbotId=YOUR_BOT_ID&size=10&page=1"
   ```

2. Has ingest script been run?
   ```bash
   npm run ingest-rds
   ```

3. Check MySQL:
   ```sql
   SELECT COUNT(*) FROM conversation;
   ```

### API Key Errors

- Verify key is copied correctly (no spaces)
- Check it has `get-conversations` permission
- Regenerate if needed in Chatbase dashboard

### Sync Takes Too Long

- Increase batch size in ingest script
- Run ingest on powerful EC2/Lambda instance
- Check MySQL connection pool size

