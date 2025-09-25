# PostgreSQL Setup Guide

## 🐘 Overview

This guide helps you set up PostgreSQL for your WC Helper application, replacing the previous Google Cloud Firestore integration.

## 📊 PostgreSQL Benefits

- **Open Source**: Free and community-driven
- **Reliable**: Battle-tested database with ACID compliance
- **Scalable**: Handles large datasets efficiently
- **Flexible**: Supports complex queries and relationships
- **Cost-Effective**: No per-query charges like cloud databases

## 🔧 Setup Steps

### 1. Install PostgreSQL

#### Windows
1. Download PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run the installer
3. Set a password for the `postgres` user
4. Note the port (default: 5432)

#### macOS
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql

# Or using Postgres.app
# Download from postgresapp.com
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE wc_helper;

# Create user (optional)
CREATE USER wc_helper_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE wc_helper TO wc_helper_user;

# Exit
\q
```

### 3. Install Node.js Dependencies

```bash
npm install pg pg-pool
```

### 4. Configure Environment Variables

Create a `.env` file in your project root:

```env
# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_HOST=localhost
POSTGRES_DB=wc_helper
POSTGRES_PASSWORD=your_password
POSTGRES_PORT=5432

# Webhook Configuration
WEBHOOK_VERIFY_TOKEN=your_verify_token
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_API_VERSION=v18.0
OPENAI_API_KEY=your_openai_api_key

# Server Configuration
PORT=3001
NODE_ENV=development
```

### 5. Initialize Database

```bash
# Run the webhook server to initialize tables
npm run webhook

# Or run initialization separately
node -e "
import { postgresService } from './src/services/postgresService.js';
await postgresService.initializeTables();
console.log('Database initialized');
process.exit(0);
"
```

## 🏗️ Database Schema

### Tables Created

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Homestays table
CREATE TABLE homestays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    amenities TEXT[],
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FAQs table
CREATE TABLE faqs (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
    id VARCHAR(255) PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL,
    message_text TEXT NOT NULL,
    is_from_customer BOOLEAN NOT NULL,
    ai_response TEXT,
    confidence REAL,
    matched_question TEXT,
    processing_time INTEGER,
    source VARCHAR(50),
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ai_processing_details JSONB,
    conversation_memory_details JSONB
);

-- Logs table
CREATE TABLE logs (
    id VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    channel VARCHAR(50),
    incoming_text TEXT,
    matched_question TEXT,
    confidence REAL,
    answer TEXT,
    processing_time INTEGER,
    source VARCHAR(50),
    ai_processing JSONB,
    final_decision VARCHAR(100),
    conversation_memory JSONB
);

-- Conversation Memory table
CREATE TABLE conversation_memory (
    phone_number VARCHAR(50) PRIMARY KEY,
    messages JSONB,
    context JSONB,
    summary TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- General Knowledge table
CREATE TABLE general_knowledge (
    id SERIAL PRIMARY KEY,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Running the Application

### 1. Start PostgreSQL
```bash
# Windows (if installed as service)
# PostgreSQL should start automatically

# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### 2. Start Webhook Server
```bash
# Production
npm run webhook

# Development with auto-reload
npm run webhook:dev
```

### 3. Start Frontend
```bash
# Development
npm run dev

# Production
npm run build
npm run preview
```

### 4. Start Public Legal Server
```bash
# Production
npm run public

# Development with auto-reload
npm run public:dev
```

## 🔄 Migration from localStorage

### Automatic Migration
```bash
# Run migration script
node -e "
import { postgresService } from './src/services/postgresService.js';
const total = await postgresService.migrateFromLocalStorage();
console.log('Migrated', total, 'items');
process.exit(0);
"
```

### Manual Migration
1. Export data from localStorage
2. Transform to PostgreSQL format
3. Import using batch operations

## 📊 Performance Optimization

### 1. Connection Pooling
```javascript
// Already configured in postgres-config.js
const dbConfig = {
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000, // Close idle connections
  connectionTimeoutMillis: 2000 // Connection timeout
};
```

### 2. Caching
```javascript
// Smart caching reduces database queries
const cacheTimeout = 5 * 60 * 1000; // 5 minutes
```

### 3. Indexing
```sql
-- Add indexes for better performance
CREATE INDEX idx_messages_phone_number ON messages(phone_number);
CREATE INDEX idx_messages_received_at ON messages(received_at);
CREATE INDEX idx_logs_created_at ON logs(created_at);
CREATE INDEX idx_faqs_is_active ON faqs(is_active);
```

## 🛡️ Security

### 1. Database Security
```sql
-- Create dedicated user
CREATE USER wc_helper_user WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE wc_helper TO wc_helper_user;
GRANT USAGE ON SCHEMA public TO wc_helper_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO wc_helper_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO wc_helper_user;
```

### 2. Connection Security
```javascript
// Use SSL in production
const dbConfig = {
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};
```

### 3. Environment Variables
- Never commit `.env` files
- Use strong passwords
- Rotate credentials regularly

## 📈 Monitoring

### 1. Database Monitoring
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check database size
SELECT pg_size_pretty(pg_database_size('wc_helper'));

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 2. Application Monitoring
```javascript
// Health check endpoint
GET /health

// Cache statistics
GET /api/postgres/stats/cache
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Connection Refused
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check port
netstat -tlnp | grep 5432
```

#### 2. Authentication Failed
```bash
# Check user permissions
psql -U postgres -c "\du"

# Reset password
sudo -u postgres psql
ALTER USER postgres PASSWORD 'new_password';
```

#### 3. Database Not Found
```sql
-- List databases
\l

-- Create database
CREATE DATABASE wc_helper;
```

### Debug Commands
```bash
# Test connection
psql -h localhost -U postgres -d wc_helper -c "SELECT version();"

# Check tables
psql -h localhost -U postgres -d wc_helper -c "\dt"

# Check data
psql -h localhost -U postgres -d wc_helper -c "SELECT COUNT(*) FROM faqs;"
```

## 🚀 Deployment

### 1. Production Database
- Use managed PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)
- Set up automated backups
- Configure monitoring and alerts

### 2. Environment Variables
```bash
# Production environment
POSTGRES_HOST=your-production-host
POSTGRES_DB=wc_helper_prod
POSTGRES_USER=wc_helper_user
POSTGRES_PASSWORD=strong_production_password
POSTGRES_PORT=5432
NODE_ENV=production
```

### 3. SSL Configuration
```javascript
// Production SSL config
const dbConfig = {
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync('path/to/ca-cert.pem').toString()
  }
};
```

## 📚 Resources

### Documentation
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js pg Documentation](https://node-postgres.com/)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)

### Tools
- [pgAdmin](https://www.pgadmin.org/) - GUI for PostgreSQL
- [DBeaver](https://dbeaver.io/) - Universal database tool
- [Postico](https://eggerapps.at/postico/) - macOS PostgreSQL client

---

**Status**: Ready for implementation
**Last Updated**: January 20, 2024
**Version**: 1.0

PostgreSQL integration is now complete and ready for production use! 🐘✨
