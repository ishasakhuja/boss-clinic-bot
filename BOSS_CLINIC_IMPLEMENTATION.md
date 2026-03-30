# Boss Clinic Chatbot - Implementation & Deployment Guide

**Created:** March 26, 2026  
**Status:** Setup Complete - Ready for Local Testing  
**Chatbase Agent ID:** qaDvYRRCydCd26jRsiJ6H  
**Website:** https://bossclinic.com.au/

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Database Setup](#database-setup)
5. [Environment Configuration](#environment-configuration)
6. [Chatbase Training](#chatbase-training)
7. [Running the Server](#running-the-server)
8. [API Reference](#api-reference)
9. [Testing & Monitoring](#testing--monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Project Overview

Boss Clinic's AI chatbot helps website visitors:
- Explore hair loss treatment options (PRP, laser, ARTAS, transplants, exosomes)
- Choose between clinic locations (Subiaco WA, Bondi NSW)
- Book consultations and capture leads
- Browse at-home products
- Get answers to treatment FAQs

### Key Features
✅ **Lead Capture** - Automated visitor lead collection  
✅ **Treatment Discovery** - AI-guided treatment recommendations  
✅ **Clinic Routing** - Route inquiries by location preference  
✅ **Consultation Conversion** - Drive booking requests  
✅ **Product Support** - Guide to at-home product offerings  
✅ **Analytics Dashboard** - Track conversations and leads  

---

## Architecture

### Tech Stack
- **Frontend:** React + Vite (with Chatbase widget embed)
- **Backend:** Node.js + Express
- **Database:** MySQL 8+ (local or RDS)
- **AI Provider:** Chatbase (integrated, no custom model needed)
- **Authentication:** JWT + Refresh Tokens
- **Cloud:** AWS (optional - DynamoDB for users/tokens)

### Data Flow
```
Website Visitor
    ↓
Chatbase Widget (embedded)
    ↓
Chatbase AI Agent (trained on Boss Clinic content)
    ↓
Webhook → Backend API
    ↓
MySQL Database (conversations, leads, referrals)
    ↓
Analytics Dashboard (React frontend)
```

### Database Tables
1. **visitor** - Unique website visitors  
2. **conversation** - Chat sessions
3. **message** - Individual messages
4. **lead** - Captured visitor contact info
5. **consultation_request** - Booking/callback requests
6. **treatment_inquiry** - Treatment interest tracking
7. **clinic_preference** - Location preferences
8. **product_view** - Product interest tracking
9. **redirection_log** - External link clicks

---

## Getting Started

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- Git
- macOS, Linux, or Windows with WSL

### Quick Start (5 minutes)

#### 1. Clone & Install
```bash
cd ~/Documents/boss-clinic-bot
npm install          # frontend
cd backend && npm install  # backend
```

#### 2. Set Up Local Database
Follow: [BOSS_CLINIC_LOCAL_DB_SETUP.md](BOSS_CLINIC_LOCAL_DB_SETUP.md)

#### 3. Configure Environment
```bash
cd backend
cp .env.boss-clinic .env

# Edit .env and set:
# RDS_HOST=localhost
# RDS_PASSWORD=(your local MySQL password, or leave empty)
# NODE_ENV=development
```

#### 4. Start Backend
```bash
cd backend
npm start  # Runs on http://localhost:4000
```

#### 5. Start Frontend
```bash
cd frontend  
npm run dev  # Runs on http://localhost:5173
```

#### 6. Test Connection
```bash
curl http://localhost:4000/
# Response: "All APIs are running!"
```

---

## Database Setup

### Local MySQL Setup (for development)

#### macOS
```bash
# Install MySQL
brew install mysql

# Start MySQL service
brew services start mysql

# Connect and create database
mysql -u root
```

In MySQL shell:
```sql
CREATE DATABASE boss_clinic_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

#### Load Schema
```bash
mysql -u root boss_clinic_db < backend/scripts/rds-mysql/boss-clinic-schema.sql

# Verify tables
mysql -u root boss_clinic_db -e "SHOW TABLES;"
```

### Production Database (AWS RDS)

For production deployment, update `.env`:
```
RDS_HOST=your-rds-endpoint.rds.amazonaws.com
RDS_PORT=3306
RDS_USER=admin
RDS_PASSWORD=your-secure-password
RDS_DATABASE=boss_clinic_db
RDS_SSL=true
RDS_CREATE_DATABASE=true
```

---

## Environment Configuration

### Environment Variables

Copy `.env.boss-clinic` template:
```bash
cp backend/.env.boss-clinic backend/.env
```

### Key Variables

#### Chatbase Configuration
```
CHATBOT_API_KEY=9b31dfc6-f37c-4808-971a-ffea21d20f39
CHATBOT_ID=qaDvYRRCydCd26jRsiJ6H
PROVIDER_GLOBAL_KEY=chatbase
```

#### Database (Local Dev)
```
RDS_HOST=localhost
RDS_PORT=3306
RDS_USER=root
RDS_PASSWORD=
RDS_DATABASE=boss_clinic_db
RDS_SSL=false
```

#### Authentication
```
ACCESS_TOKEN_SECRET=ec50e3504cb46019663128af727a99ae63e2a8f40605968cbf679436d7d36d31dd8f27da0e787bd3f5aed99241e6d09e2e047c7108cff004cf5cd5c607300623
ACCESS_TOKEN_EXPIRES_IN=1440m
REFRESH_TOKEN_EXPIRES_DAYS=30
```

#### Optional: Google Sheets Feedback
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-email@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY=<your-key>
GOOGLE_SHEET_ID=<sheet-id>
GOOGLE_SHEET_TAB=Feedback
```

---

## Chatbase Training

### Step 1: Add Training Content
Log into Chatbase → Agent Configuration → Knowledge Base

Add these sources:
1. **Website URLs:**
   - Home: https://bossclinic.com.au/
   - Men's treatments: https://bossclinic.com.au/men-hair-loss-treatment-australia
   - Women's treatments: https://bossclinic.com.au/women-hair-loss-treatment-australia
   - Treatment pages: PRP, Laser, ARTAS, Transplant, Exosomes
   - Before & After: https://bossclinic.com.au/real-results
   - FAQs: https://bossclinic.com.au/faq
   - Consultation: https://bossclinic.com.au/book-consultation
   - Store: https://bossclinic.com.au/store
   - Contact/Locations: Both clinic pages

2. **Optional Documents:**
   - Treatment comparison guide (PDF)
   - Suitability questionnaire
   - FAQ sheets
   - Pricing reference

### Step 2: Configure System Prompt
See: [CHATBASE_TRAINING_GUIDE.md](CHATBASE_TRAINING_GUIDE.md#part-2-conversation-flow-training)

Key points:
- Only reference official Boss Clinic materials
- Recommend consultations for diagnosis
- Route to correct clinic by location
- Encourage lead capture
- Pre-qualify leads

### Step 3: Test Agent
In Chatbase chat interface, test these queries:
1. "I'm losing my hair"
2. "What's PRP therapy?"
3. "Where are you located?"
4. "How do I book a consultation?"
5. "Do you have at-home products?"

Expected: Bot answers with Boss Clinic info and guides toward consultation

### Step 4: Deploy to Website
Chatbase provides embed code:
```html
<!-- Add to website footer -->
<script>
  window.embeddedChatbotConfig = {
    chatbotId: "qaDvYRRCydCd26jRsiJ6H",
    domain: "www.chatbase.co"
  }
</script>
<script src="https://www.chatbase.co/embed.min.js"></script>
```

---

## Running the Server

### Development Mode

#### Terminal 1: Backend API
```bash
cd backend
npm start

# Output:
# Server running on http://localhost:4000
# Listening for/api/sync/chats webhook...
```

#### Terminal 2: Frontend Dashboard
```bash
cd frontend
npm run dev

# Output:
# VITE v5.x.x ready in xxx ms
# ➜  Local:   http://localhost:5173/
```

#### Terminal 3: Watch for Chatbase Webhooks
Backend automatically receives conversation webhooks from Chatbase and syncs to MySQL.

### Production Deployment

#### Build Frontend
```bash
cd frontend
npm run build

# Creates dist/ folder ready for deployment (Vercel, S3, Cloudfront)
```

#### Deploy Backend
Option 1: Traditional Server
```bash
# SSH into server
ssh user@your-server.com

# Clone repo and start
npm install
npm start

# Use PM2 to keep running:
npm install -g pm2
pm2 start index.js --name boss-clinic
pm2 startup
pm2 save
```

Option 2: AWS Lambda (for webhooks only)
- Deploy `backend/scripts/lambda/chatbot-conv-to-rds-ingest.js` as Lambda function
- Trigger via Chatbase webhook

---

## API Reference

### Public Endpoints

#### Health Check
```bash
GET /
# Response: "All APIs are running!"
```

#### Redirect Tracking
```bash
GET /api/redirect?url=https://example.com&cid=conv123
# Logs click and redirects user
```

### Protected Endpoints (Require Authentication)

#### Authentication

**Login**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "staff@bossclinic.com.au",
  "password": "your-password"
}

# Response:
{
  "success": true,
  "accessToken": "eyJ...",
  "user": {
    "email": "staff@bossclinic.com.au",
    "name": "Staff Member",
    "role": "admin"
  }
}
```

**Refresh Token**
```bash
POST /api/auth/refresh
Cookie: refresh_token=...

# Response: { "success": true, "accessToken": "..." }
```

**Logout**
```bash
POST /api/auth/logout

# Response: { "success": true }
```

#### Dashboard Data

**Get Conversations**
```bash
GET /api/conversations?size=100&from=2024-03-01&to=2024-03-31
Authorization: Bearer <accessToken>

# Response:
{
  "data": [
    {
      "conversation_id": "abc123",
      "visitor_id": "xyz789",
      "status": "ended",
      "started_at": "2024-03-15T10:30:00Z",
      "last_message": "Thanks for the info!",
      "last_message_sender": "user"
    }
  ]
}
```

**Get Single Conversation**
```bash
GET /api/conversations/abc123
Authorization: Bearer <accessToken>

# Returns full conversation with all messages
```

**Get Leads**
```bash
GET /api/leads?size=50&from=2024-03-01
Authorization: Bearer <accessToken>

# Response:
{
  "data": [
    {
      "lead_id": "lead123",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+61412345678",
      "gender": "male",
      "hair_loss_duration": "2 years",
      "interested_treatments": "PRP, Transplant",
      "preferred_clinic": "bondi_nsw",
      "status": "captured",
      "captured_at": "2024-03-15T10:45:00Z"
    }
  ]
}
```

#### Sync Data

**Manual Chat Sync**
```bash
POST /api/sync/chats
Authorization: Bearer <accessToken>

# Manually trigger sync of Chatbase conversations to MySQL
# Response:
{
  "success": true,
  "duration_ms": 1234,
  "conversationsUpserted": 42,
  "leadsUpserted": 8
}
```

#### Feedback

**Submit Answer Feedback**
```bash
POST /api/answer-feedback
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "conversationId": "conv123",
  "messageId": "msg456",
  "question": "What is PRP?",
  "currentAnswer": "PRP is platelet-rich plasma...",
  "expectedAnswer": "PRP should explain the autologous process..."
}

# Response: { "success": true }
```

---

## Testing & Monitoring

### Manual Testing

#### 1. Create Test User
```bash
node backend/scripts/create-user.js

# Prompts for:
# Email: testadmin@bossclinic.com.au
# Name: Test Admin
# Password: TestPassword123!
# Role: admin
```

#### 2. Test Login Flow
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testadmin@bossclinic.com.au","password":"TestPassword123!"}'
```

#### 3. Test Protected Endpoint
```bash
# Use the accessToken from login response
curl http://localhost:4000/api/leads \
  -H "Authorization: Bearer <accessToken>"
```

#### 4. View Database
```bash
mysql -u root boss_clinic_db

# Check tables
SELECT COUNT(*) FROM conversation;
SELECT COUNT(*) FROM lead WHERE status = 'captured';

# View recent leads
SELECT name, email, phone, interested_treatments, captured_at 
FROM lead 
ORDER BY captured_at DESC 
LIMIT 10;
```

### Monitoring

#### Application Logs
```bash
# Watch backend logs in real-time
cd backend
npm start 2>&1 | tee app.log

# Watch for sync messages:
tail -f app.log | grep "sync"
```

#### Database Metrics
```bash
# Conversation growth
mysql -u root boss_clinic_db -e "
  SELECT DATE(started_at) as date, COUNT(*) as conversations 
  FROM conversation 
  GROUP BY DATE(started_at) 
  ORDER BY date DESC;
"

# Lead capture rate
mysql -u root boss_clinic_db -e "
  SELECT status, COUNT(*) as count 
  FROM lead 
  GROUP BY status;
"

# Top treatments of interest
mysql -u root boss_clinic_db -e "
  SELECT interested_treatments, COUNT(*) as count 
  FROM lead 
  WHERE interested_treatments IS NOT NULL 
  GROUP BY interested_treatments 
  ORDER BY count DESC;
"

# Clinic preference
mysql -u root boss_clinic_db -e "
  SELECT preferred_clinic, COUNT(*) as count 
  FROM lead 
  WHERE preferred_clinic IS NOT NULL 
  GROUP BY preferred_clinic;
"
```

---

## Troubleshooting

### Issue: Chatbase Not Syncing to Database

**Symptoms:** Conversations visible in Chatbase but not in MySQL

**Solutions:**
1. Check webhook is configured in Chatbase settings
2. Verify MySQL connection:
   ```bash
   mysql -u root -p boss_clinic_db -e "SELECT * FROM conversation LIMIT 1;"
   ```
3. Check backend logs for sync errors
4. Manually trigger sync:
   ```bash
   curl -X POST http://localhost:4000/api/sync/chats \
     -H "Authorization: Bearer <token>"
   ```

### Issue: Bot Not Using Boss Clinic Info

**Symptoms:** Bot gives generic responses or references wrong content

**Solutions:**
1. Verify knowledge base has all Boss Clinic URLs in Chatbase
2. Check system prompt is specific to Boss Clinic (see CHATBASE_TRAINING_GUIDE.md)
3. Test bot directly in Chatbase chat interface
4. Make sure no conflicting knowledge sources were added

### Issue: Database Connection Error

**Symptoms:** "Error: connect ECONNREFUSED 127.0.0.1:3306"

**Solutions:**
```bash
# Check MySQL is running
mysql -u root

# If fails, start MySQL:
brew services start mysql  # macOS
sudo service mysql start   # Linux

# Check port:
sudo lsof -i :3306

# Verify connection string in .env
cat backend/.env | grep RDS_
```

### Issue: Authentication Token Expired

**Symptoms:** 401 Unauthorized errors

**Solutions:**
1. Get new token: `POST /api/auth/refresh`
2. Login again: `POST /api/auth/login`
3. Check token in Authorization header format (use `Bearer xxx`, not just `xxx`)

### Issue: Port Already in Use

**Symptoms:** "Error: listen EADDRINUSE :::4000"

**Solutions:**
```bash
# Kill process on port 4000
sudo lsof -i :4000
sudo kill -9 <PID>

# OR use different port:
PORT=4001 npm start
```

---

## Checklists

### Pre-Launch Checklist

- [ ] Local MySQL database set up and accessible
- [ ] Backend starts without errors on `npm start`
- [ ] Frontend starts without errors on `npm run dev`
- [ ] Test user created and can login
- [ ] Chatbase agent trained with all Boss Clinic content
- [ ] Chatbase webhook configured to backend
- [ ] Sample conversation syncs from Chatbase to MySQL
- [ ] Leads table shows captured leads
- [ ] Dashboard displays conversations and leads
- [ ] Medical disclaimers in agent prompt
- [ ] Team trained on bot capabilities

### Deployment Checklist

- [ ] Environment variables set correctly for production
- [ ] Production database (RDS or equivalent) created
- [ ] Database schema loaded to production DB  
- [ ] Backend deployed and reachable at production URL
- [ ] Frontend built and deployed (Vercel, S3, Cloudfront, etc)
- [ ] CORS origin list updated for production domain
- [ ] SSL/TLS certificates configured
- [ ] Backup/disaster recovery plan in place
- [ ] Monitoring and alerting configured
- [ ] Daily monitoring of conversations and leads

---

## Support & Resources

### Documentation Files
- [BOSS_CLINIC_LOCAL_DB_SETUP.md](BOSS_CLINIC_LOCAL_DB_SETUP.md) - Database setup
- [CHATBASE_TRAINING_GUIDE.md](CHATBASE_TRAINING_GUIDE.md) - AI agent training
- [CHATBASE_INTEGRATION_GUIDE.md](CHATBASE_INTEGRATION_GUIDE.md) - API integration details

### Key Files
- **Backend Config:** `backend/.env.boss-clinic`
- **Database Schema:** `backend/scripts/rds-mysql/boss-clinic-schema.sql`
- **Main API:** `backend/index.js`
- **Chat Ingest:** `backend/scripts/lambda/chatbot-conv-to-rds-ingest.js`
- **Frontend:** `frontend/src/`

### Contact & Questions
- For Chatbase support: https://help.chatbase.co/
- For Boss Clinic specific requirements: Consult with clinic stakeholders

---

## Glossary

| Term | Definition |
|------|-----------|
| **Chatbase** | AI chat platform hosting the boss-clinic bot |
| **Lead** | Captured visitor contact info (name, email, phone) |
| **Conversation** | Single chat session between visitor and bot |
| **Message** | Individual text in a conversation |
| **Intent** | Detected user purpose (e.g., treatment_inquiry, booking) |
| **Clinic Routing** | Directing lead to Subiaco or Bondi location |
| **Consultation** | Free initial appointment to assess suitability |

---

**Last Updated:** March 26, 2026  
**Version:** 1.0 - Initial Setup  
**Next Review:** After first 50 conversations captured
