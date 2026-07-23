-- TATA AIG Health Insurance Voice Agent — D1 schema
-- Replaces the old restaurant schema (menu, cart, orders) entirely.

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  age INTEGER,
  gender TEXT,
  occupation TEXT,
  city TEXT,
  pincode TEXT,
  medical_history TEXT,
  existing_insurer TEXT,
  renewal_date TEXT,
  family_members INTEGER,
  coverage_needed TEXT,
  budget TEXT,
  buying_timeline TEXT,
  language TEXT DEFAULT 'en',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS voice_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  call_sid TEXT UNIQUE NOT NULL,
  customer_id INTEGER,
  phone TEXT,
  status TEXT DEFAULT 'in_progress',
  call_duration INTEGER,
  stage TEXT DEFAULT 'greeting',
  profiling_index INTEGER DEFAULT 0,
  session_data TEXT DEFAULT '{}',
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS conversation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  call_sid TEXT NOT NULL,
  speaker TEXT NOT NULL, -- 'customer' | 'asha'
  message TEXT NOT NULL,
  stage TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS insurance_quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  plan_name TEXT,
  coverage_amount TEXT,
  premium_estimate TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS lead_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  score INTEGER NOT NULL,
  tier TEXT NOT NULL, -- 'hot' | 'warm' | 'cold'
  reasons TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  preferred_date TEXT,
  preferred_time TEXT,
  advisor_status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS callbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  reason TEXT,
  callback_time TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_calls_sid ON voice_calls(call_sid);
CREATE INDEX IF NOT EXISTS idx_logs_sid ON conversation_logs(call_sid);
