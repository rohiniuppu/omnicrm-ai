import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { generateSeedData } from './generator.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCHEMA_FILE = path.join(__dirname, 'schema.sql');

async function seed() {
  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mini_crm',
    port: parseInt(process.env.DB_PORT || '3306')
  };

  console.log('🌱 Starting database seeding process...');
  console.log(`🔌 Connecting to host: ${dbConfig.host}:${dbConfig.port}, DB: ${dbConfig.database}...`);

  let connection;
  try {
    // Connect to mysql without specifying DB first to create it if it doesn't exist
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port
    });

    console.log('🔨 Creating database if it does not exist...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await connection.query(`USE \`${dbConfig.database}\``);
    console.log(`✅ Database \`${dbConfig.database}\` is active.`);

    console.log('📄 Reading schema.sql...');
    const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
    
    // Split by semicolon, filter out empty lines or comments
    const queries = schemaSql
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    console.log('🧹 Executing schema tables reset...');
    // We must execute queries sequentially
    for (const query of queries) {
      await connection.query(query);
    }
    console.log('✅ MySQL tables recreated successfully.');

    // Generate mock seed data
    console.log('📦 Generating mock dataset (120 customers, 500+ orders)...');
    const { customers, orders, segments } = generateSeedData();

    // Insert Customers
    console.log(`📥 Inserting ${customers.length} customers...`);
    const insertCustomerSql = `
      INSERT INTO customers (id, name, email, phone, city, total_spend, order_count, last_purchase_date, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    for (const c of customers) {
      const lastPurchaseDate = c.last_purchase_date ? c.last_purchase_date.slice(0, 19).replace('T', ' ') : null;
      const createdAt = c.created_at.slice(0, 19).replace('T', ' ');
      await connection.query(insertCustomerSql, [
        c.id, c.name, c.email, c.phone, c.city, c.total_spend, c.order_count, lastPurchaseDate, createdAt
      ]);
    }

    // Insert Orders
    console.log(`📥 Inserting ${orders.length} orders...`);
    const insertOrderSql = `
      INSERT INTO orders (id, customer_id, amount, date, product_name, created_at) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    for (const o of orders) {
      const orderDate = o.date.slice(0, 19).replace('T', ' ');
      await connection.query(insertOrderSql, [
        o.id, o.customer_id, o.amount, orderDate, o.product_name, orderDate
      ]);
    }

    // Insert Segments
    console.log(`📥 Inserting baseline segments...`);
    const insertSegmentSql = `
      INSERT INTO segments (id, name, description, filters, created_at)
      VALUES (?, ?, ?, ?, ?)
    `;
    for (const s of segments) {
      const createdAt = s.created_at.slice(0, 19).replace('T', ' ');
      await connection.query(insertSegmentSql, [
        s.id, s.name, s.description, s.filters, createdAt
      ]);
    }

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed with error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seed();
