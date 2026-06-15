-- CREATE DATABASE IF NOT EXISTS mini_crm;
-- USE mini_crm;

-- Drop tables if they exist to start clean during setup/seeding
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS communications;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS segments;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;

-- 1. Customers Table
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  city VARCHAR(100),
  total_spend DECIMAL(10, 2) DEFAULT 0.00,
  order_count INT DEFAULT 0,
  last_purchase_date DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Orders Table
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  product_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 3. Segments Table
CREATE TABLE segments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  filters JSON NOT NULL, -- JSON structure representing filters
  description VARCHAR(500),
  ai_explanation TEXT,
  ai_reasoning JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Campaigns Table
CREATE TABLE campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  segment_id INT,
  channel ENUM('WhatsApp', 'SMS', 'Email', 'RCS') NOT NULL,
  message_template TEXT NOT NULL,
  ai_explanation TEXT,
  ai_reasoning JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE SET NULL
);

-- 5. Communications Table
CREATE TABLE communications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT NOT NULL,
  customer_id INT NOT NULL,
  message TEXT NOT NULL,
  status ENUM('SENT', 'DELIVERED', 'FAILED', 'OPENED', 'CLICKED', 'CONVERTED') DEFAULT 'SENT',
  conversion_status ENUM('PENDING', 'CONVERTED') DEFAULT 'PENDING',
  conversion_amount DECIMAL(10, 2) DEFAULT NULL,
  converted_at TIMESTAMP DEFAULT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 6. Events Table
CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  communication_id INT NOT NULL,
  event_type ENUM('SENT', 'DELIVERED', 'FAILED', 'OPENED', 'CLICKED', 'CONVERTED') NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (communication_id) REFERENCES communications(id) ON DELETE CASCADE
);

-- Index for analytics querying
CREATE INDEX idx_comms_status ON communications(status);
CREATE INDEX idx_comms_campaign ON communications(campaign_id);
CREATE INDEX idx_events_comms ON events(communication_id);
