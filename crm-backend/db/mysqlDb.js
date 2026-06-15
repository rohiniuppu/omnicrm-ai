import mysql from 'mysql2/promise';

let pool = null;

export function initMysql(config) {
  pool = mysql.createPool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    port: config.port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  console.log(`🔌 Initialized MySQL Connection Pool for database: ${config.database}`);
}

async function query(sql, params) {
  if (!pool) throw new Error('MySQL connection pool not initialized.');
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export const mysqlDb = {
  // CUSTOMERS
  async getCustomers(filters = {}) {
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (filters.total_spend) {
      sql += ` AND total_spend ${filters.total_spend.operator} ?`;
      params.push(filters.total_spend.value);
    }
    if (filters.city) {
      sql += ` AND city ${filters.city.operator} ?`;
      params.push(filters.city.value);
    }
    if (filters.order_count) {
      sql += ` AND order_count ${filters.order_count.operator} ?`;
      params.push(filters.order_count.value);
    }
    if (filters.last_purchase_date) {
      const { operator, value } = filters.last_purchase_date;
      if (typeof value === 'number') {
        if (operator === '<' || operator === '<=') {
          sql += ` AND last_purchase_date < DATE_SUB(NOW(), INTERVAL ? DAY)`;
        } else {
          sql += ` AND last_purchase_date >= DATE_SUB(NOW(), INTERVAL ? DAY)`;
        }
        params.push(value);
      } else {
        sql += ` AND last_purchase_date ${operator} ?`;
        params.push(value);
      }
    }

    sql += ' ORDER BY id DESC';
    return await query(sql, params);
  },

  async getCustomerById(id) {
    const rows = await query('SELECT * FROM customers WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async createCustomer(customer) {
    const result = await query(
      'INSERT INTO customers (name, email, phone, city, total_spend, order_count) VALUES (?, ?, ?, ?, 0.00, 0)',
      [customer.name, customer.email, customer.phone || '', customer.city || '']
    );
    return {
      id: result.insertId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      city: customer.city || '',
      total_spend: 0.00,
      order_count: 0,
      last_purchase_date: null
    };
  },

  async updateCustomer(id, data) {
    await query(
      'UPDATE customers SET name = ?, email = ?, phone = ?, city = ? WHERE id = ?',
      [data.name, data.email, data.phone || '', data.city || '', id]
    );
    return await this.getCustomerById(id);
  },

  async deleteCustomer(id) {
    const result = await query('DELETE FROM customers WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  // ORDERS
  async createOrder(order) {
    const orderDate = order.date || new Date().toISOString().slice(0, 19).replace('T', ' ');
    const result = await query(
      'INSERT INTO orders (customer_id, amount, date, product_name) VALUES (?, ?, ?, ?)',
      [order.customer_id, order.amount, orderDate, order.product_name]
    );

    // Update customer aggregates
    await query(
      `UPDATE customers c SET 
        c.order_count = (SELECT COUNT(*) FROM orders WHERE customer_id = c.id),
        c.total_spend = COALESCE((SELECT SUM(amount) FROM orders WHERE customer_id = c.id), 0.00),
        c.last_purchase_date = (SELECT MAX(date) FROM orders WHERE customer_id = c.id)
       WHERE c.id = ?`,
      [order.customer_id]
    );

    return {
      id: result.insertId,
      customer_id: order.customer_id,
      amount: order.amount,
      date: orderDate,
      product_name: order.product_name
    };
  },

  async getOrdersByCustomerId(customerId) {
    return await query('SELECT * FROM orders WHERE customer_id = ? ORDER BY date DESC', [customerId]);
  },

  // SEGMENTS
  async getSegments() {
    const rows = await query('SELECT * FROM segments ORDER BY id DESC', []);
    return rows.map(r => ({
      ...r,
      filters: typeof r.filters === 'string' ? r.filters : JSON.stringify(r.filters),
      ai_reasoning: typeof r.ai_reasoning === 'string' ? JSON.parse(r.ai_reasoning || '[]') : (r.ai_reasoning || [])
    }));
  },

  async getSegmentById(id) {
    const rows = await query('SELECT * FROM segments WHERE id = ?', [id]);
    if (!rows[0]) return null;
    return {
      ...rows[0],
      filters: typeof rows[0].filters === 'string' ? rows[0].filters : JSON.stringify(rows[0].filters),
      ai_reasoning: typeof rows[0].ai_reasoning === 'string' ? JSON.parse(rows[0].ai_reasoning || '[]') : (rows[0].ai_reasoning || [])
    };
  },

  async createSegment(segment) {
    const filtersStr = typeof segment.filters === 'string' ? segment.filters : JSON.stringify(segment.filters);
    const reasoningStr = JSON.stringify(segment.ai_reasoning || []);
    const result = await query(
      'INSERT INTO segments (name, filters, description, ai_explanation, ai_reasoning) VALUES (?, ?, ?, ?, ?)',
      [segment.name, filtersStr, segment.description || '', segment.ai_explanation || '', reasoningStr]
    );
    return {
      id: result.insertId,
      name: segment.name,
      description: segment.description || '',
      filters: filtersStr,
      ai_explanation: segment.ai_explanation || '',
      ai_reasoning: segment.ai_reasoning || []
    };
  },

  async deleteSegment(id) {
    const result = await query('DELETE FROM segments WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  // CAMPAIGNS
  async getCampaigns() {
    const rows = await query(
      'SELECT c.*, s.name as segment_name FROM campaigns c LEFT JOIN segments s ON c.segment_id = s.id ORDER BY c.id DESC',
      []
    );
    return rows.map(row => ({
      ...row,
      ai_reasoning: typeof row.ai_reasoning === 'string' ? JSON.parse(row.ai_reasoning || '[]') : (row.ai_reasoning || [])
    }));
  },

  async getCampaignById(id) {
    const rows = await query(
      'SELECT c.*, s.name as segment_name FROM campaigns c LEFT JOIN segments s ON c.segment_id = s.id WHERE c.id = ?',
      [id]
    );
    if (!rows[0]) return null;
    return {
      ...rows[0],
      ai_reasoning: typeof rows[0].ai_reasoning === 'string' ? JSON.parse(rows[0].ai_reasoning || '[]') : (rows[0].ai_reasoning || [])
    };
  },

  async createCampaign(campaign) {
    const reasoningStr = JSON.stringify(campaign.ai_reasoning || []);
    const result = await query(
      'INSERT INTO campaigns (name, segment_id, channel, message_template, ai_explanation, ai_reasoning) VALUES (?, ?, ?, ?, ?, ?)',
      [campaign.name, campaign.segment_id || null, campaign.channel, campaign.message_template, campaign.ai_explanation || '', reasoningStr]
    );
    return {
      id: result.insertId,
      name: campaign.name,
      segment_id: campaign.segment_id || null,
      channel: campaign.channel,
      message_template: campaign.message_template,
      ai_explanation: campaign.ai_explanation || '',
      ai_reasoning: campaign.ai_reasoning || []
    };
  },

  // COMMUNICATIONS
  async getCommunications(campaignId = null) {
    let sql = `
      SELECT c.*, cust.name as customer_name, cust.email as customer_email, cust.phone as customer_phone, camp.name as campaign_name 
      FROM communications c 
      JOIN customers cust ON c.customer_id = cust.id 
      JOIN campaigns camp ON c.campaign_id = camp.id
    `;
    const params = [];
    if (campaignId) {
      sql += ' WHERE c.campaign_id = ?';
      params.push(campaignId);
    }
    sql += ' ORDER BY c.id DESC';
    return await query(sql, params);
  },

  async getCommunicationById(id) {
    const rows = await query(
      `SELECT c.*, cust.name as customer_name, cust.email as customer_email, cust.phone as customer_phone
       FROM communications c
       JOIN customers cust ON c.customer_id = cust.id
       WHERE c.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async createCommunication(comm) {
    const result = await query(
      'INSERT INTO communications (campaign_id, customer_id, message, status) VALUES (?, ?, ?, ?)',
      [comm.campaign_id, comm.customer_id, comm.message, comm.status || 'SENT']
    );

    const commId = result.insertId;

    // Log default SENT event
    await this.createEvent({
      communication_id: commId,
      event_type: 'SENT'
    });

    return {
      id: commId,
      campaign_id: comm.campaign_id,
      customer_id: comm.customer_id,
      message: comm.message,
      status: comm.status || 'SENT'
    };
  },

  async updateCommunicationStatus(id, status) {
    if (status === 'CONVERTED') {
      const comm = await this.getCommunicationById(id);
      if (comm) {
        const PRODUCTS = [
          'Wireless Earbuds', 'Mechanical Keyboard', 'Smart Watch', 'Leather Wallet', 
          'Insulated Water Bottle', 'Running Shoes', 'Ceramic Coffee Mug', 'Ergonomic Gaming Mouse', 
          'Travel Backpack', 'Felt Desk Pad', 'LED Desk Lamp', 'Adjustable Phone Stand', 
          'Fast Wireless Charger', 'Bluetooth Speaker', 'Notebook & Pen Set'
        ];
        
        // Fetch campaign details
        const campaignRows = await query('SELECT * FROM campaigns WHERE id = ?', [comm.campaign_id]);
        const campaign = campaignRows[0];
        
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

        // Update communication log
        await query(
          `UPDATE communications SET 
            status = 'CONVERTED', 
            conversion_status = 'CONVERTED', 
            conversion_amount = ?, 
            converted_at = NOW() 
           WHERE id = ?`,
          [conversionAmount, id]
        );

        // Record the conversion order
        const orderDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await query(
          'INSERT INTO orders (customer_id, amount, date, product_name) VALUES (?, ?, ?, ?)',
          [comm.customer_id, conversionAmount, orderDate, productName]
        );

        // Recalculate customer aggregates
        await query(
          `UPDATE customers c SET 
            c.order_count = (SELECT COUNT(*) FROM orders WHERE customer_id = c.id),
            c.total_spend = COALESCE((SELECT SUM(amount) FROM orders WHERE customer_id = c.id), 0.00),
            c.last_purchase_date = (SELECT MAX(date) FROM orders WHERE customer_id = c.id)
           WHERE c.id = ?`,
          [comm.customer_id]
        );
      }
    } else {
      await query('UPDATE communications SET status = ? WHERE id = ?', [status, id]);
    }

    // Log event event record
    await this.createEvent({
      communication_id: id,
      event_type: status
    });

    return await this.getCommunicationById(id);
  },

  // EVENTS
  async createEvent(event) {
    const result = await query(
      'INSERT INTO events (communication_id, event_type) VALUES (?, ?)',
      [event.communication_id, event.event_type]
    );
    return {
      id: result.insertId,
      communication_id: event.communication_id,
      event_type: event.event_type
    };
  },

  // ANALYTICS
  async getAnalytics() {
    // 1. Overall stats
    const summaryRows = await query(
      `SELECT 
        COUNT(*) as total_sent,
        SUM(CASE WHEN status IN ('DELIVERED', 'OPENED', 'CLICKED', 'CONVERTED') THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status IN ('OPENED', 'CLICKED', 'CONVERTED') THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN status IN ('CLICKED', 'CONVERTED') THEN 1 ELSE 0 END) as clicked,
        SUM(CASE WHEN conversion_status = 'CONVERTED' THEN 1 ELSE 0 END) as conversions
      FROM communications`,
      []
    );

    const summary = summaryRows[0] || { total_sent: 0, delivered: 0, failed: 0, opened: 0, clicked: 0, conversions: 0 };
    const totalSent = summary.total_sent;
    const delivered = summary.delivered || 0;
    const failed = summary.failed || 0;
    const opened = summary.opened || 0;
    const clicked = summary.clicked || 0;
    const conversions = summary.conversions || 0;

    const conversionRate = totalSent > 0 ? parseFloat(((conversions / totalSent) * 100).toFixed(2)) : 0;
    const deliveryRate = totalSent > 0 ? parseFloat(((delivered / totalSent) * 100).toFixed(2)) : 0;
    const openRate = delivered > 0 ? parseFloat(((opened / delivered) * 100).toFixed(2)) : 0;

    // 2. Campaign Wise Breakdown
    const campaignsStats = await query(
      `SELECT 
        c.id as campaign_id,
        c.name as campaign_name,
        c.channel,
        COUNT(comm.id) as sent,
        SUM(CASE WHEN comm.status IN ('DELIVERED', 'OPENED', 'CLICKED', 'CONVERTED') THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN comm.status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN comm.status IN ('OPENED', 'CLICKED', 'CONVERTED') THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN comm.status IN ('CLICKED', 'CONVERTED') THEN 1 ELSE 0 END) as clicked,
        SUM(CASE WHEN comm.conversion_status = 'CONVERTED' THEN 1 ELSE 0 END) as conversions
      FROM campaigns c
      LEFT JOIN communications comm ON c.id = comm.campaign_id
      GROUP BY c.id, c.name, c.channel
      ORDER BY c.id DESC`,
      []
    );

    // 3. Timeline (past 7 days)
    const timelineRows = await query(
      `SELECT 
        DATE_FORMAT(sent_at, '%Y-%m-%d') as date,
        COUNT(*) as sent,
        SUM(CASE WHEN status IN ('OPENED', 'CLICKED', 'CONVERTED') THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN status IN ('CLICKED', 'CONVERTED') THEN 1 ELSE 0 END) as clicked,
        SUM(CASE WHEN conversion_status = 'CONVERTED' THEN 1 ELSE 0 END) as conversions
      FROM communications
      WHERE sent_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(sent_at)
      ORDER BY DATE(sent_at) ASC`,
      []
    );

    // Fill missing days with 0 values
    const timelineMap = {};
    timelineRows.forEach(row => {
      timelineMap[row.date] = {
        date: row.date,
        sent: row.sent,
        opened: parseInt(row.opened || 0),
        clicked: parseInt(row.clicked || 0),
        conversions: parseInt(row.conversions || 0)
      };
    });

    const timeline = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      if (timelineMap[dateStr]) {
        timeline.push(timelineMap[dateStr]);
      } else {
        timeline.push({
          date: dateStr,
          sent: 0,
          opened: 0,
          clicked: 0,
          conversions: 0
        });
      }
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
      campaigns: campaignsStats.map(c => ({
        ...c,
        sent: parseInt(c.sent || 0),
        delivered: parseInt(c.delivered || 0),
        failed: parseInt(c.failed || 0),
        opened: parseInt(c.opened || 0),
        clicked: parseInt(c.clicked || 0),
        conversions: parseInt(c.conversions || 0),
        conversion_rate: c.sent > 0 ? parseFloat(((c.conversions / c.sent) * 100).toFixed(2)) : 0
      })),
      timeline
    };
  }
};
