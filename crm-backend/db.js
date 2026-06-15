import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mysqlDb, initMysql } from './db/mysqlDb.js';
import { mockDb, initMockDb } from './db/mockDb.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let activeDb = null;
let isFallbackActive = false;

export async function initDatabase() {
  const useFallback = process.env.DB_FALLBACK === 'true';
  
  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mini_crm',
    port: parseInt(process.env.DB_PORT || '3306')
  };

  try {
    console.log('🔄 Attempting to connect to MySQL...');
    initMysql(dbConfig);
    
    // Test connection
    const connection = await mysqlDb.getCustomers({ limit: 1 }).catch(err => {
      throw err;
    });
    
    activeDb = mysqlDb;
    isFallbackActive = false;
    console.log('✅ Connected to MySQL Database successfully.');
  } catch (error) {
    console.warn('⚠️ Could not connect to MySQL database:', error.message);
    
    if (useFallback) {
      console.log('🔌 DB_FALLBACK is enabled. Switching to local JSON Mock Database...');
      initMockDb();
      activeDb = mockDb;
      isFallbackActive = true;
      console.log('✅ JSON Mock Database is now active.');
    } else {
      console.error('❌ Connection failed and DB_FALLBACK is disabled. Exiting...');
      throw error;
    }
  }
}

// Data access proxy object
export const db = {
  get isFallback() {
    return isFallbackActive;
  },
  
  getCustomers(filters) {
    return activeDb.getCustomers(filters);
  },
  
  getCustomerById(id) {
    return activeDb.getCustomerById(id);
  },
  
  createCustomer(customer) {
    return activeDb.createCustomer(customer);
  },
  
  updateCustomer(id, data) {
    return activeDb.updateCustomer(id, data);
  },
  
  deleteCustomer(id) {
    return activeDb.deleteCustomer(id);
  },
  
  createOrder(order) {
    return activeDb.createOrder(order);
  },
  
  getOrdersByCustomerId(customerId) {
    return activeDb.getOrdersByCustomerId(customerId);
  },
  
  getSegments() {
    return activeDb.getSegments();
  },
  
  getSegmentById(id) {
    return activeDb.getSegmentById(id);
  },
  
  createSegment(segment) {
    return activeDb.createSegment(segment);
  },
  
  deleteSegment(id) {
    return activeDb.deleteSegment(id);
  },
  
  getCampaigns() {
    return activeDb.getCampaigns();
  },
  
  getCampaignById(id) {
    return activeDb.getCampaignById(id);
  },
  
  createCampaign(campaign) {
    return activeDb.createCampaign(campaign);
  },
  
  getCommunications(campaignId) {
    return activeDb.getCommunications(campaignId);
  },
  
  getCommunicationById(id) {
    return activeDb.getCommunicationById(id);
  },
  
  createCommunication(comm) {
    return activeDb.createCommunication(comm);
  },
  
  updateCommunicationStatus(id, status) {
    return activeDb.updateCommunicationStatus(id, status);
  },
  
  createEvent(event) {
    return activeDb.createEvent(event);
  },
  
  getAnalytics() {
    return activeDb.getAnalytics();
  }
};
