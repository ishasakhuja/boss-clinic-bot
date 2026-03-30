# Boss Clinic Bot - Local Database Setup Guide

## Prerequisites
- MySQL 8.0+ installed locally
- Terminal/Command line access
- Node.js 18+

## Step 1: Install MySQL (if not already installed)

### macOS
```bash
# Using Homebrew
brew install mysql
brew services start mysql

# Verify installation
mysql --version
```

### Windows
- Download from: https://dev.mysql.com/downloads/mysql/
- Or use: `choco install mysql` (if using Chocolatey)

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install mysql-server
sudo service mysql start
```

## Step 2: Access MySQL and Create Database

```bash
# Connect to MySQL (default user is root, no password)
mysql -u root

# Or if you have a password:
mysql -u root -p
```

Inside MySQL shell:
```sql
-- Create the Boss Clinic database
CREATE DATABASE boss_clinic_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Show databases to confirm
SHOW DATABASES;

-- Exit MySQL
EXIT;
```

## Step 3: Load the Schema

```bash
# From your project root
mysql -u root boss_clinic_db < backend/scripts/rds-mysql/boss-clinic-schema.sql

# Verify tables were created
mysql -u root boss_clinic_db -e "SHOW TABLES;"
```

You should see these 9 tables:
- visitor
- conversation
- message
- lead
- consultation_request
- treatment_inquiry
- clinic_preference
- product_view
- redirection_log

## Step 4: Configure Environment

Copy the provided `.env.boss-clinic` file:

```bash
cd backend

# Copy the environment template
cp .env.boss-clinic .env

# OR: Update your existing .env with these key values:
# RDS_HOST=localhost
# RDS_DATABASE=boss_clinic_db
# RDS_USER=root
# RDS_PASSWORD=          # (empty if no password)
# RDS_SSL=false
```

## Step 5: Install & Run Backend

```bash
# From backend directory
npm install

# Start the server
npm start
```

You should see:
```
Server running on http://localhost:4000
```

## Step 6: Verify Connection

```bash
# In another terminal, test the API
curl http://localhost:4000/

# Response should be: "All APIs are running!"
```

## Database Connection Troubleshooting

### Issue: "Access denied for user 'root'@'localhost'"
**Solution:**
```bash
# Password might be required
mysql -u root -p boss_clinic_db

# Or reset MySQL password
# https://dev.mysql.com/doc/refman/8.0/en/resetting-permissions.html
```

### Issue: "Unknown database 'boss_clinic_db'"
**Solution:**
```bash
# Verify database was created
mysql -u root -e "SHOW DATABASES;"

# If missing, recreate it:
mysql -u root < backend/scripts/rds-mysql/boss-clinic-schema.sql
```

### Issue: Tables are empty after schema import
**Solution:**
```bash
# Verify schema was loaded
mysql -u root boss_clinic_db -e "SHOW TABLES;"

# If no tables, manually run:
mysql -u root boss_clinic_db < backend/scripts/rds-mysql/boss-clinic-schema.sql
```

### Issue: RDS_SSL connection error
**Solution:**
- Ensure `RDS_SSL=false` in your `.env` file for local MySQL
- Local MySQL doesn't require SSL certificates

## Database Utilities

### Create a test user
```bash
node backend/scripts/create-user.js
```

### View all visitors
```bash
mysql -u root boss_clinic_db -e "SELECT * FROM visitor LIMIT 10;"
```

### View all leads
```bash
mysql -u root boss_clinic_db -e "SELECT * FROM lead WHERE status='captured';"
```

### Clear all data (⚠️ destructive)
```bash
mysql -u root boss_clinic_db < backend/scripts/rds-mysql/boss-clinic-schema.sql
```

## Next Steps
1. [Configure Chatbase Agent](#chatbase-configuration)
2. [Train Bot with Boss Clinic Content](#training-content)
3. [Start Frontend Development](#frontend-setup)

## Additional Resources
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [MySQL Workbench GUI](https://www.mysql.com/products/workbench/) (optional, desktop client)
- [How to seed test data](#seeding-test-data)

## Seeding Test Data (Optional)

Create `backend/scripts/seed-boss-clinic.js`:

```javascript
import { getRdsPool } from "../rds.js";

async function seedData() {
  const pool = getRdsPool();
  const conn = await pool.getConnection();
  
  try {
    // Insert test visitor
    await conn.query(
      `INSERT INTO visitor (name, email, gender, hair_concern_duration) 
       VALUES (?, ?, ?, ?)`,
      ["John Test", "john@test.com", "male", "1+ years"]
    );
    
    console.log("✅ Test data seeded successfully");
  } finally {
    conn.release();
    pool.end();
  }
}

seedData().catch(console.error);
```

Run with:
```bash
node backend/scripts/seed-boss-clinic.js
```
