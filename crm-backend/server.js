import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db, initDatabase } from './db.js';
import { geminiService } from './geminiService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CHANNEL_SERVICE_URL = process.env.CHANNEL_SERVICE_URL || 'http://localhost:5001';

app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    databaseFallback: db.isFallback
  });
});

// ----------------------------------------------------
// 1. CUSTOMERS ENDPOINTS
// ----------------------------------------------------

// Get all customers (supports optional segmentId parameter)
app.get('/api/customers', async (req, res) => {
  try {
    const { segmentId } = req.query;
    let filters = {};

    if (segmentId) {
      const segment = await db.getSegmentById(segmentId);
      if (segment) {
        filters = JSON.parse(segment.filters);
      } else {
        return res.status(404).json({ error: 'Segment not found' });
      }
    }

    const customers = await db.getCustomers(filters);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer by ID (with order history)
app.get('/api/customers/:id', async (req, res) => {
  try {
    const customer = await db.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const orders = await db.getOrdersByCustomerId(req.params.id);
    res.json({ ...customer, orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Customer
app.post('/api/customers', async (req, res) => {
  const { name, email, phone, city } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and Email are required' });
  }
  try {
    const customer = await db.createCustomer({ name, email, phone, city });
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Customer
app.put('/api/customers/:id', async (req, res) => {
  const { name, email, phone, city } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and Email are required' });
  }
  try {
    const updated = await db.updateCustomer(req.params.id, { name, email, phone, city });
    if (!updated) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Customer
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const success = await db.deleteCustomer(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// 2. ORDERS ENDPOINTS
// ----------------------------------------------------

// Add Order
app.post('/api/orders', async (req, res) => {
  const { customer_id, amount, product_name, date } = req.body;
  if (!customer_id || !amount || !product_name) {
    return res.status(400).json({ error: 'Customer ID, Amount, and Product Name are required' });
  }
  try {
    const order = await db.createOrder({ customer_id, amount, product_name, date });
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// 3. SEGMENTS & AI SEGMENT GENERATOR
// ----------------------------------------------------

// Save Segment
app.post('/api/segments', async (req, res) => {
  const { name, filters, description, ai_explanation, ai_reasoning } = req.body;
  if (!name || !filters) {
    return res.status(400).json({ error: 'Name and Filters are required' });
  }
  try {
    const segment = await db.createSegment({ name, filters, description, ai_explanation, ai_reasoning });
    res.status(201).json(segment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Segments
app.get('/api/segments', async (req, res) => {
  try {
    const segments = await db.getSegments();
    res.json(segments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Segment
app.delete('/api/segments/:id', async (req, res) => {
  try {
    const success = await db.deleteSegment(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    res.json({ message: 'Segment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Segment generation from natural language
app.post('/api/segments/ai-generate', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query prompt is required' });
  }
  try {
    const generated = await geminiService.generateFiltersFromPrompt(query);
    res.json(generated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test filter criteria against database without saving
app.post('/api/segments/test-filters', async (req, res) => {
  const { filters } = req.body;
  try {
    const customers = await db.getCustomers(filters);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// 4. CAMPAIGNS & AI MESSAGE GENERATOR
// ----------------------------------------------------

// Get Campaigns
app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await db.getCampaigns();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Campaign
app.post('/api/campaigns', async (req, res) => {
  const { name, segment_id, channel, message_template, ai_explanation, ai_reasoning } = req.body;
  if (!name || !channel || !message_template) {
    return res.status(400).json({ error: 'Name, Channel, and Message Template are required' });
  }
  try {
    const campaign = await db.createCampaign({ name, segment_id, channel, message_template, ai_explanation, ai_reasoning });
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Personalization copy generator
app.post('/api/campaigns/ai-message', async (req, res) => {
  const { goal, channel } = req.body;
  if (!goal || !channel) {
    return res.status(400).json({ error: 'Goal and Channel are required' });
  }
  try {
    const copy = await geminiService.generateCampaignMessage(goal, channel);
    res.json({ copy });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute Campaign (Trigger Communications)
app.post('/api/campaigns/:id/send', async (req, res) => {
  const campaignId = req.params.id;
  try {
    const campaign = await db.getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get segment matching customers
    let filters = {};
    if (campaign.segment_id) {
      const segment = await db.getSegmentById(campaign.segment_id);
      if (segment) {
        filters = JSON.parse(segment.filters);
      }
    }

    const customers = await db.getCustomers(filters);
    if (customers.length === 0) {
      return res.status(400).json({ error: 'Selected segment has 0 matching customers' });
    }

    console.log(`🚀 Triggering campaign "${campaign.name}" to ${customers.length} customers over ${campaign.channel}...`);

    const communicationsSent = [];

    // Loop customers, create communications, send async trigger to channel service
    for (const customer of customers) {
      // Personalize message
      const personalizedMessage = campaign.message_template.replace(/\[Customer Name\]/g, customer.name);

      // Save database record (default status is 'SENT')
      const commRecord = await db.createCommunication({
        campaign_id: campaignId,
        customer_id: customer.id,
        message: personalizedMessage,
        status: 'SENT'
      });

      communicationsSent.push(commRecord);

      // Async send to simulator service (do not block execution)
      fetch(`${CHANNEL_SERVICE_URL}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communication_id: commRecord.id,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          channel: campaign.channel,
          message: personalizedMessage
        })
      }).catch(err => {
        console.error(`❌ Channel Service connection failed for communication ${commRecord.id}:`, err.message);
      });
    }

    res.json({
      message: `Campaign send process triggered for ${customers.length} customers.`,
      recipient_count: customers.length,
      communications: communicationsSent
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Campaign Agent: Plan Campaign (returns suggested Segment + Filters + Copy + Channel)
app.post('/api/campaigns/ai-agent', async (req, res) => {
  const { goal } = req.body;
  if (!goal) {
    return res.status(400).json({ error: 'Business goal is required' });
  }
  try {
    const campaignLayout = await geminiService.generateCampaignFromGoal(goal);
    res.json(campaignLayout);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Campaign Agent: Save & Launch Approved Campaign
app.post('/api/campaigns/agent-launch', async (req, res) => {
  const { 
    campaignName, 
    segmentName, 
    segmentDescription, 
    filters, 
    channel, 
    messageTemplate, 
    aiExplanation,
    reasoning,
    launchImmediately 
  } = req.body;

  if (!campaignName || !segmentName || !channel || !messageTemplate) {
    return res.status(400).json({ error: 'Missing required campaign setup parameters.' });
  }

  try {
    // 1. Create the segment
    const segment = await db.createSegment({
      name: segmentName,
      filters: filters,
      description: segmentDescription || 'AI Agent generated segment.',
      ai_explanation: aiExplanation || segmentDescription || 'AI Agent generated segment.',
      ai_reasoning: reasoning || []
    });

    // 2. Create the campaign
    const campaign = await db.createCampaign({
      name: campaignName,
      segment_id: segment.id,
      channel: channel,
      message_template: messageTemplate,
      ai_explanation: aiExplanation || '',
      ai_reasoning: reasoning || []
    });

    let recipientCount = 0;
    const communicationsSent = [];

    // 3. Launch if requested
    if (launchImmediately) {
      const customers = await db.getCustomers(filters);
      recipientCount = customers.length;

      if (recipientCount > 0) {
        for (const customer of customers) {
          const personalizedMessage = messageTemplate.replace(/\[Customer Name\]/g, customer.name);

          const commRecord = await db.createCommunication({
            campaign_id: campaign.id,
            customer_id: customer.id,
            message: personalizedMessage,
            status: 'SENT'
          });

          communicationsSent.push(commRecord);

          fetch(`${CHANNEL_SERVICE_URL}/send-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              communication_id: commRecord.id,
              customer_name: customer.name,
              customer_email: customer.email,
              customer_phone: customer.phone,
              channel: channel,
              message: personalizedMessage
            })
          }).catch(err => {
            console.error(`❌ Channel Service connection failed for Comm ${commRecord.id}:`, err.message);
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: launchImmediately 
        ? `Segment and Campaign saved. Broadcast launched to ${recipientCount} customers.`
        : 'Segment and Campaign saved successfully (draft mode).',
      segment,
      campaign,
      recipient_count: recipientCount,
      communications: communicationsSent
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// 5. COMMUNICATION LOGS & WEBHOOKS
// ----------------------------------------------------

// Get Communications
app.get('/api/communications', async (req, res) => {
  try {
    const { campaignId } = req.query;
    const comms = await db.getCommunications(campaignId);
    res.json(comms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Channel Service Status Update Callback Webhook
app.post('/api/webhooks/channel-callback', async (req, res) => {
  const { communication_id, status } = req.body;
  if (!communication_id || !status) {
    return res.status(400).json({ error: 'Communication ID and Status are required' });
  }

  try {
    console.log(`🔔 Webhook Callback received: Comm #${communication_id} -> ${status}`);
    const updated = await db.updateCommunicationStatus(communication_id, status);
    
    if (!updated) {
      return res.status(404).json({ error: 'Communication record not found' });
    }
    
    res.json({ success: true, updated_status: status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// 6. ANALYTICS
// ----------------------------------------------------
app.get('/api/analytics', async (req, res) => {
  try {
    const analytics = await db.getAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// SERVER BOOTSTRAP
// ----------------------------------------------------
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`🚀 CRM Backend Server running at http://localhost:${PORT}`);
      console.log(`📡 Integrated with Channel Service at ${CHANNEL_SERVICE_URL}`);
      console.log(`==================================================`);
    });
  } catch (err) {
    console.error('❌ Server startup crashed:', err.message);
    process.exit(1);
  }
}

startServer();
