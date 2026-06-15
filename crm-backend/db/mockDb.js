import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSeedData } from './generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'mock_db.json');

// Memory cache
let dbData = {
  customers: [],
  orders: [],
  segments: [],
  campaigns: [],
  communications: [],
  events: []
};

// Load data from file or seed if it doesn't exist
export function initMockDb() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      dbData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      console.log('📦 Loaded existing mock database from', DATA_FILE);
      return;
    } catch (e) {
      console.error('Failed to parse mock database, re-seeding.', e);
    }
  }

  console.log('🌱 Mock database file not found. Seeding new data...');
  const seed = generateSeedData();
  dbData.customers = seed.customers;
  dbData.orders = seed.orders;
  dbData.segments = seed.segments;
  dbData.campaigns = [];
  dbData.communications = [];
  dbData.events = [];
  saveDb();
  console.log(`✅ Seeded ${dbData.customers.length} customers and ${dbData.orders.length} orders successfully.`);
}

function saveDb() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(dbData, null, 2), 'utf8');
}

// Helpers for customer aggregation updates
function updateCustomerStats(customerId) {
  const customer = dbData.customers.find(c => c.id === customerId);
  if (!customer) return;

  const customerOrders = dbData.orders.filter(o => o.customer_id === customerId);
  customer.order_count = customerOrders.length;
  
  const total = customerOrders.reduce((sum, o) => sum + parseFloat(o.amount), 0);
  customer.total_spend = parseFloat(total.toFixed(2));

  if (customerOrders.length > 0) {
    const dates = customerOrders.map(o => new Date(o.date));
    const maxDate = new Date(Math.max(...dates));
    customer.last_purchase_date = maxDate.toISOString();
  } else {
    customer.last_purchase_date = null;
  }
  saveDb();
}

// ----------------------------------------------------
// DATABASE API IMPLEMENTATION
// ----------------------------------------------------

export const mockDb = {
  // CUSTOMERS
  async getCustomers(filters = {}) {
    let result = [...dbData.customers];

    // Apply filters if they exist
    if (Object.keys(filters).length > 0) {
      result = result.filter(customer => {
        for (const [field, rule] of Object.entries(filters)) {
          if (!rule || typeof rule !== 'object') continue;
          
          const { operator, value } = rule;
          let itemVal = customer[field];
          
          if (field === 'last_purchase_date') {
            if (!itemVal) return false;
            
            // Value could be either a direct date comparison or "days ago"
            if (operator === '<' || operator === '<=' || operator === '>' || operator === '>=') {
              const itemDate = new Date(itemVal);
              const comparisonDate = new Date();
              
              if (typeof value === 'number') {
                // value is "days ago"
                comparisonDate.setDate(comparisonDate.getDate() - value);
                // "haven't purchased in 30 days" means last_purchase_date < 30 days ago (older)
                // "purchased within 30 days" means last_purchase_date > 30 days ago (newer)
                if (operator === '<' || operator === '<=') {
                  if (!(itemDate < comparisonDate)) return false;
                } else {
                  if (!(itemDate >= comparisonDate)) return false;
                }
              } else {
                // value is a YYYY-MM-DD date string
                const targetDate = new Date(value);
                if (operator === '<' && !(itemDate < targetDate)) return false;
                if (operator === '<=' && !(itemDate <= targetDate)) return false;
                if (operator === '>' && !(itemDate > targetDate)) return false;
                if (operator === '>=' && !(itemDate >= targetDate)) return false;
              }
            }
            continue;
          }

          // Numeric or String comparisons
          if (operator === '>') {
            if (!(parseFloat(itemVal) > parseFloat(value))) return false;
          } else if (operator === '>=') {
            if (!(parseFloat(itemVal) >= parseFloat(value))) return false;
          } else if (operator === '<') {
            if (!(parseFloat(itemVal) < parseFloat(value))) return false;
          } else if (operator === '<=') {
            if (!(parseFloat(itemVal) <= parseFloat(value))) return false;
          } else if (operator === '=') {
            if (typeof itemVal === 'string') {
              if (itemVal.toLowerCase() !== String(value).toLowerCase()) return false;
            } else {
              if (parseFloat(itemVal) !== parseFloat(value)) return false;
            }
          } else if (operator === '!=') {
            if (typeof itemVal === 'string') {
              if (itemVal.toLowerCase() === String(value).toLowerCase()) return false;
            } else {
              if (parseFloat(itemVal) === parseFloat(value)) return false;
            }
          }
        }
        return true;
      });
    }

    // Sort by id descending by default
    return result.sort((a, b) => b.id - a.id);
  },

  async getCustomerById(id) {
    const custId = parseInt(id);
    return dbData.customers.find(c => c.id === custId) || null;
  },

  async createCustomer(customer) {
    const nextId = dbData.customers.reduce((max, c) => c.id > max ? c.id : max, 0) + 1;
    const newCustomer = {
      id: nextId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      city: customer.city || '',
      total_spend: 0.00,
      order_count: 0,
      last_purchase_date: null,
      created_at: new Date().toISOString()
    };
    dbData.customers.push(newCustomer);
    saveDb();
    return newCustomer;
  },

  async updateCustomer(id, updateData) {
    const custId = parseInt(id);
    const index = dbData.customers.findIndex(c => c.id === custId);
    if (index === -1) return null;

    dbData.customers[index] = {
      ...dbData.customers[index],
      name: updateData.name ?? dbData.customers[index].name,
      email: updateData.email ?? dbData.customers[index].email,
      phone: updateData.phone ?? dbData.customers[index].phone,
      city: updateData.city ?? dbData.customers[index].city
    };
    saveDb();
    return dbData.customers[index];
  },

  async deleteCustomer(id) {
    const custId = parseInt(id);
    const index = dbData.customers.findIndex(c => c.id === custId);
    if (index === -1) return false;

    dbData.customers.splice(index, 1);
    // Delete linked orders
    dbData.orders = dbData.orders.filter(o => o.customer_id !== custId);
    saveDb();
    return true;
  },

  // ORDERS
  async createOrder(order) {
    const nextId = dbData.orders.reduce((max, o) => o.id > max ? o.id : max, 0) + 1;
    const newOrder = {
      id: nextId,
      customer_id: parseInt(order.customer_id),
      amount: parseFloat(order.amount),
      date: order.date || new Date().toISOString(),
      product_name: order.product_name,
      created_at: new Date().toISOString()
    };
    dbData.orders.push(newOrder);
    saveDb();
    
    // Update customer stats
    updateCustomerStats(newOrder.customer_id);
    
    return newOrder;
  },

  async getOrdersByCustomerId(customerId) {
    const custId = parseInt(customerId);
    return dbData.orders
      .filter(o => o.customer_id === custId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  // SEGMENTS
  async getSegments() {
    return dbData.segments.sort((a, b) => b.id - a.id);
  },

  async getSegmentById(id) {
    const segId = parseInt(id);
    return dbData.segments.find(s => s.id === segId) || null;
  },

  async createSegment(segment) {
    const nextId = dbData.segments.reduce((max, s) => s.id > max ? s.id : max, 0) + 1;
    const newSegment = {
      id: nextId,
      name: segment.name,
      description: segment.description || '',
      filters: typeof segment.filters === 'string' ? segment.filters : JSON.stringify(segment.filters),
      ai_explanation: segment.ai_explanation || '',
      ai_reasoning: Array.isArray(segment.ai_reasoning) ? segment.ai_reasoning : [],
      created_at: new Date().toISOString()
    };
    dbData.segments.push(newSegment);
    saveDb();
    return newSegment;
  },

  async deleteSegment(id) {
    const segId = parseInt(id);
    const index = dbData.segments.findIndex(s => s.id === segId);
    if (index === -1) return false;

    dbData.segments.splice(index, 1);
    saveDb();
    return true;
  },

  // CAMPAIGNS
  async getCampaigns() {
    // Map with segment info
    return dbData.campaigns.map(camp => {
      const segment = dbData.segments.find(s => s.id === camp.segment_id);
      return {
        ...camp,
        segment_name: segment ? segment.name : 'All Customers'
      };
    }).sort((a, b) => b.id - a.id);
  },

  async getCampaignById(id) {
    const campId = parseInt(id);
    const camp = dbData.campaigns.find(c => c.id === campId);
    if (!camp) return null;
    const segment = dbData.segments.find(s => s.id === camp.segment_id);
    return {
      ...camp,
      segment_name: segment ? segment.name : 'All Customers'
    };
  },

  async createCampaign(campaign) {
    const nextId = dbData.campaigns.reduce((max, c) => c.id > max ? c.id : max, 0) + 1;
    const newCampaign = {
      id: nextId,
      name: campaign.name,
      segment_id: campaign.segment_id ? parseInt(campaign.segment_id) : null,
      channel: campaign.channel,
      message_template: campaign.message_template,
      ai_explanation: campaign.ai_explanation || '',
      ai_reasoning: Array.isArray(campaign.ai_reasoning) ? campaign.ai_reasoning : [],
      created_at: new Date().toISOString()
    };
    dbData.campaigns.push(newCampaign);
    saveDb();
    return newCampaign;
  },

  // COMMUNICATIONS
  async getCommunications(campaignId = null) {
    let list = [...dbData.communications];
    if (campaignId) {
      const campId = parseInt(campaignId);
      list = list.filter(c => c.campaign_id === campId);
    }
    
    return list.map(comm => {
      const customer = dbData.customers.find(c => c.id === comm.customer_id);
      const campaign = dbData.campaigns.find(c => c.id === comm.campaign_id);
      return {
        ...comm,
        customer_name: customer ? customer.name : 'Unknown Customer',
        customer_email: customer ? customer.email : '',
        customer_phone: customer ? customer.phone : '',
        campaign_name: campaign ? campaign.name : 'Unknown Campaign'
      };
    }).sort((a, b) => b.id - a.id);
  },

  async getCommunicationById(id) {
    const commId = parseInt(id);
    const comm = dbData.communications.find(c => c.id === commId);
    if (!comm) return null;
    const customer = dbData.customers.find(c => c.id === comm.customer_id);
    return {
      ...comm,
      customer_name: customer ? customer.name : 'Unknown Customer',
      customer_email: customer ? customer.email : '',
      customer_phone: customer ? customer.phone : ''
    };
  },

  async createCommunication(comm) {
    const nextId = dbData.communications.reduce((max, c) => c.id > max ? c.id : max, 0) + 1;
    const newComm = {
      id: nextId,
      campaign_id: parseInt(comm.campaign_id),
      customer_id: parseInt(comm.customer_id),
      message: comm.message,
      status: comm.status || 'SENT',
      conversion_status: 'PENDING',
      conversion_amount: null,
      converted_at: null,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    dbData.communications.push(newComm);
    saveDb();
    
    // Add default SENT event
    await this.createEvent({
      communication_id: newComm.id,
      event_type: 'SENT'
    });
    
    return newComm;
  },

  async updateCommunicationStatus(id, status) {
    const commId = parseInt(id);
    const comm = dbData.communications.find(c => c.id === commId);
    if (!comm) return null;

    comm.status = status;
    comm.updated_at = new Date().toISOString();

    if (status === 'CONVERTED') {
      comm.conversion_status = 'CONVERTED';
      comm.converted_at = new Date().toISOString();

      // Determine product and realistic random price
      const PRODUCTS = [
        'Wireless Earbuds', 'Mechanical Keyboard', 'Smart Watch', 'Leather Wallet', 
        'Insulated Water Bottle', 'Running Shoes', 'Ceramic Coffee Mug', 'Ergonomic Gaming Mouse', 
        'Travel Backpack', 'Felt Desk Pad', 'LED Desk Lamp', 'Adjustable Phone Stand', 
        'Fast Wireless Charger', 'Bluetooth Speaker', 'Notebook & Pen Set'
      ];
      
      const campaign = dbData.campaigns.find(c => c.id === comm.campaign_id);
      let productName = 'Store Purchase';
      let conversionAmount = parseFloat((Math.random() * 3000 + 500).toFixed(2)); // Default ₹500 to ₹3500

      if (campaign) {
        const matchedProduct = PRODUCTS.find(p => 
          campaign.name.toLowerCase().includes(p.toLowerCase()) || 
          campaign.message_template.toLowerCase().includes(p.toLowerCase())
        );

        if (matchedProduct) {
          productName = matchedProduct;
          let basePrice = 1500;
          if (productName === 'Mechanical Keyboard') basePrice = 4500;
          else if (productName === 'Smart Watch') basePrice = 4000;
          else if (productName === 'Wireless Earbuds') basePrice = 2500;
          else if (productName === 'Running Shoes') basePrice = 3500;
          else if (productName === 'Bluetooth Speaker') basePrice = 2200;
          else if (productName === 'Travel Backpack') basePrice = 1800;
          else if (productName === 'Leather Wallet') basePrice = 1200;
          
          const variation = (Math.random() * 0.3 - 0.15) * basePrice; // +/- 15% variation
          conversionAmount = parseFloat((basePrice + variation).toFixed(2));
        }
      }

      comm.conversion_amount = conversionAmount;

      // Create matching order for the customer
      const nextOrderId = dbData.orders.reduce((max, o) => o.id > max ? o.id : max, 0) + 1;
      const orderDate = new Date().toISOString();
      const newOrder = {
        id: nextOrderId,
        customer_id: comm.customer_id,
        amount: conversionAmount,
        date: orderDate,
        product_name: productName,
        created_at: orderDate
      };
      dbData.orders.push(newOrder);
      
      // Update customer aggregates
      updateCustomerStats(comm.customer_id);
    }

    saveDb();

    // Log the event
    await this.createEvent({
      communication_id: commId,
      event_type: status
    });

    return comm;
  },

  // EVENTS
  async createEvent(event) {
    const nextId = dbData.events.reduce((max, e) => e.id > max ? e.id : max, 0) + 1;
    const newEvent = {
      id: nextId,
      communication_id: parseInt(event.communication_id),
      event_type: event.event_type,
      timestamp: new Date().toISOString()
    };
    dbData.events.push(newEvent);
    saveDb();
    return newEvent;
  },

  // ANALYTICS
  async getAnalytics() {
    const comms = dbData.communications;
    
    const totalSent = comms.length;
    const delivered = comms.filter(c => ['DELIVERED', 'OPENED', 'CLICKED', 'CONVERTED'].includes(c.status)).length;
    const failed = comms.filter(c => c.status === 'FAILED').length;
    const opened = comms.filter(c => ['OPENED', 'CLICKED', 'CONVERTED'].includes(c.status)).length;
    const clicked = comms.filter(c => ['CLICKED', 'CONVERTED'].includes(c.status)).length;
    const conversions = comms.filter(c => c.conversion_status === 'CONVERTED').length;

    const conversionRate = totalSent > 0 ? parseFloat(((conversions / totalSent) * 100).toFixed(2)) : 0;
    const deliveryRate = totalSent > 0 ? parseFloat(((delivered / totalSent) * 100).toFixed(2)) : 0;
    const openRate = delivered > 0 ? parseFloat(((opened / delivered) * 100).toFixed(2)) : 0;

    // Campaign wise breakdown
    const campaignStats = {};
    for (const campaign of dbData.campaigns) {
      const campComms = comms.filter(c => c.campaign_id === campaign.id);
      const cSent = campComms.length;
      const cDelivered = campComms.filter(c => ['DELIVERED', 'OPENED', 'CLICKED', 'CONVERTED'].includes(c.status)).length;
      const cFailed = campComms.filter(c => c.status === 'FAILED').length;
      const cOpened = campComms.filter(c => ['OPENED', 'CLICKED', 'CONVERTED'].includes(c.status)).length;
      const cClicked = campComms.filter(c => ['CLICKED', 'CONVERTED'].includes(c.status)).length;
      const cConverted = campComms.filter(c => c.conversion_status === 'CONVERTED').length;

      campaignStats[campaign.id] = {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        channel: campaign.channel,
        sent: cSent,
        delivered: cDelivered,
        failed: cFailed,
        opened: cOpened,
        clicked: cClicked,
        conversions: cConverted,
        conversion_rate: cSent > 0 ? parseFloat(((cConverted / cSent) * 100).toFixed(2)) : 0
      };
    }

    // Timeline stats (last 7 days)
    const timeline = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayComms = comms.filter(c => c.sent_at.startsWith(dateStr));
      const daySent = dayComms.length;
      const dayOpened = dayComms.filter(c => ['OPENED', 'CLICKED', 'CONVERTED'].includes(c.status)).length;
      const dayClicked = dayComms.filter(c => ['CLICKED', 'CONVERTED'].includes(c.status)).length;
      const dayConverted = dayComms.filter(c => c.conversion_status === 'CONVERTED').length;

      timeline.push({
        date: dateStr,
        sent: daySent,
        opened: dayOpened,
        clicked: dayClicked,
        conversions: dayConverted
      });
    }

    return {
      summary: {
        total_sent: totalSent,
        delivered,
        failed,
        opened,
        clicked,
        conversions,
        conversion_rate: conversionRate,
        delivery_rate: deliveryRate,
        open_rate: openRate
      },
      campaigns: Object.values(campaignStats),
      timeline
    };
  }
};
