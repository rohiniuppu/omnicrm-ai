import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
let aiClient = null;

if (apiKey && apiKey.trim() !== '' && apiKey !== 'your_gemini_api_key') {
  try {
    aiClient = new GoogleGenAI({ apiKey });
    console.log('🤖 Gemini AI Client initialized successfully.');
  } catch (err) {
    console.error('⚠️ Failed to initialize Gemini AI Client:', err.message);
  }
} else {
  console.warn('⚠️ GEMINI_API_KEY is not configured. Falling back to local rule-based mock parser.');
}

// Local mock parser fallback when Gemini is not available
function localRuleBasedParser(userQuery) {
  const query = userQuery.toLowerCase();
  const filters = {};
  const reasoning = [];
  let explanation = "Mock parsed segment: ";

  // Total Spend matching
  const spendMatch = query.match(/(?:spent|spend|more than|greater than|>)\s*(?:₹|rs\.?|)?\s*(\d+)/i);
  if (spendMatch) {
    const value = parseInt(spendMatch[1]);
    filters.total_spend = { operator: '>', value };
    reasoning.push(`Total spend above ₹${value}`);
    explanation += `Customers spending more than ₹${value}. `;
  }

  // City matching
  const cities = ['mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai', 'pune', 'kolkata', 'ahmedabad', 'jaipur', 'lucknow'];
  for (const city of cities) {
    if (query.includes(city)) {
      const formattedCity = city.charAt(0).toUpperCase() + city.slice(1);
      filters.city = { operator: '=', value: formattedCity };
      reasoning.push(`Selected customers from ${formattedCity}`);
      explanation += `Located in ${formattedCity}. `;
      break;
    }
  }

  // Last Purchase date (Days ago)
  const daysMatch = query.match(/(?:last purchased|haven't purchased|no order|inactive for|older than)\s*(\d+)\s*days/i);
  if (daysMatch) {
    const value = parseInt(daysMatch[1]);
    filters.last_purchase_date = { operator: '<', value }; // older than X days
    reasoning.push(`No purchase in the last ${value} days`);
    explanation += `No purchases in the last ${value} days. `;
  } else if (query.includes('30 days') || query.includes('month')) {
    filters.last_purchase_date = { operator: '<', value: 30 };
    reasoning.push('No purchase in the last 30 days');
    explanation += `No purchases in the last 30 days. `;
  }

  // Order count
  const ordersMatch = query.match(/(?:order count|orders|purchases)\s*(?:of|>=|more than|>)?\s*(\d+)/i);
  if (ordersMatch) {
    const value = parseInt(ordersMatch[1]);
    filters.order_count = { operator: '>=', value };
    reasoning.push(`At least ${value} previous orders`);
    explanation += `Having at least ${value} orders. `;
  }

  if (Object.keys(filters).length === 0) {
    // Default fallback
    filters.total_spend = { operator: '>', value: 1000 };
    explanation = "No matching criteria found. Showing customers who spent more than ₹1000 by default.";
    reasoning.push('Fallback to a high-intent audience with spend above ₹1000');
  }

  return { filters, explanation, reasoning };
}

export const geminiService = {
  /**
   * Parse a natural language prompt into structured database filters.
   */
  async generateFiltersFromPrompt(prompt) {
    if (!aiClient) {
      return localRuleBasedParser(prompt);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const systemInstruction = `
You are an AI assistant in a Marketing CRM. Your task is to convert a user's natural language query into a structured JSON filter object to query a customer table.

The database customer schema contains:
- total_spend (decimal): Total amount spent by the customer.
- city (string): City where the customer resides.
- order_count (integer): Total number of orders placed.
- last_purchase_date (date/timestamp): Date of the last purchase.

Format the output strictly as a JSON object with this exact structure:
{
  "filters": {
    "total_spend": { "operator": ">" | "<" | ">=" | "<=" | "=", "value": number },
    "city": { "operator": "=" | "!=", "value": "string" },
    "order_count": { "operator": ">" | "<" | ">=" | "<=" | "=", "value": number },
    "last_purchase_date": { "operator": "<" | ">" | "<=" | ">=", "value": number } // Use number representing 'days ago'
  },
  "explanation": "A clean, marketing-focused explanation of what this segment targets, and why it is useful."
}

Rules for JSON:
1. ONLY include fields that are mentioned or implied in the user's query.
2. For dates relative to today:
   - "haven't purchased in 30 days" means the purchase date is older than 30 days ago. Use: {"last_purchase_date": {"operator": "<", "value": 30}}
   - "purchased within 30 days" means purchase date is within the last 30 days. Use: {"last_purchase_date": {"operator": ">=", "value": 30}}
3. Do not include markdown code block formatting like \`\`\`json. Output ONLY raw valid JSON.
4. Current date is ${todayStr}.
5. If the query asks for a specific currency symbol like ₹ or $, ignore the symbol and just capture the numeric value.
`;

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `System context:\n${systemInstruction}\n\nUser Query: "${prompt}"` }] }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || '';
      const parsed = JSON.parse(responseText.trim());
      
      // Safety checks
      return {
        filters: parsed.filters || {},
        explanation: parsed.explanation || "AI-generated segment based on query.",
        reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : []
      };
    } catch (error) {
      console.error('❌ Gemini Segment Generation failed:', error.message);
      return localRuleBasedParser(prompt);
    }
  },

  /**
   * Generate highly personalized marketing copy for campaigns.
   */
  async generateCampaignMessage(goal, channel) {
    const defaultCopy = {
      Email: "Subject: Exclusive Offer for you!\n\nHi [Customer Name],\n\nWe noticed you haven't shopped with us recently. Here is an exclusive 20% discount on your next order! Use code SAVE20 at checkout.\n\nCheers,\nYour Brand Team",
      SMS: "Hi [Customer Name]! We miss you. Get 20% off your next purchase using code SAVE20. Shop now: bit.ly/shop-crm",
      WhatsApp: "Hello [Customer Name]! 👋 We hope you are doing well. It's been a while since your last purchase. To welcome you back, here is an exclusive coupon for *20% OFF* on all items! Use code *SAVE20* at checkout. Shop here: bit.ly/shop-crm",
      RCS: "Hi [Customer Name]! We have picked some special products just for you. Get 20% off your purchase today. Use code SAVE20. [View Products]"
    };

    if (!aiClient) {
      return defaultCopy[channel] || defaultCopy.SMS;
    }

    const systemInstruction = `
You are a expert marketing copywriter. Generate a marketing message for a campaign over ${channel}.
The goal of the campaign is: "${goal}".
The message must be tailored specifically for ${channel} formatting rules:
- SMS: Short, concise, under 160 characters.
- Email: Needs a Subject line at the very top, followed by a body.
- WhatsApp: Can use emojis, bullet points, and bold text formatting using asterisks (e.g. *bold text*).
- RCS: Engaging, concise, can support buttons/cards description text.

You MUST include the personalization placeholder '[Customer Name]' (exactly as written with brackets) so the CRM can dynamically swap it for the customer's actual name. Do not generate markdown containers or code blocks. Output the copy directly.
`;

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: systemInstruction,
      });

      return response.text ? response.text.trim() : defaultCopy[channel];
    } catch (error) {
      console.error('❌ Gemini Message Generation failed:', error.message);
      return defaultCopy[channel] || defaultCopy.SMS;
    }
  },

  /**
   * Explain the filters of a segment.
   */
  async getSegmentExplanation(filters) {
    if (!aiClient) {
      return "This segment filters customers based on total spend, location, or purchase behavior.";
    }

    const systemInstruction = `
Given a JSON query filter object, write a short, friendly, one-sentence marketing summary explaining who this segment includes and why it's a valuable audience for campaigns.

Filters:
${JSON.stringify(filters, null, 2)}
`;

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: systemInstruction,
      });

      return response.text ? response.text.trim() : "Custom defined segment audience.";
    } catch (error) {
      return "Custom defined segment audience.";
    }
  },

  /**
   * AI Campaign Agent: Converts a business goal into a complete target segment, 
   * channel recommendation, campaign copy, name, and marketing explanation.
   */
  async generateCampaignFromGoal(goal) {
    if (!aiClient) {
      return localCampaignAgentMock(goal);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const systemInstruction = `
You are an expert AI Marketing Agent. Your job is to convert a user's business goal into a fully structured, targetable, and personalizable marketing campaign.

The database customer schema contains:
- total_spend (decimal): Total spend in Rupees.
- city (string): Residing city.
- order_count (integer): Count of orders.
- last_purchase_date (date/timestamp): Date of last purchase.

Format the output strictly as a JSON object with this exact structure:
{
  "campaignName": "string (A punchy marketing campaign name)",
  "segmentName": "string (A descriptive name for the targeted segment)",
  "segmentDescription": "string (Brief description of this target segment)",
  "filters": {
    "total_spend": { "operator": ">" | "<" | ">=" | "<=" | "=", "value": number },
    "city": { "operator": "=" | "!=", "value": "string" },
    "order_count": { "operator": ">" | "<" | ">=" | "<=" | "=", "value": number },
    "last_purchase_date": { "operator": "<" | ">" | "<=" | ">=", "value": number } // Use days ago (e.g. 30)
  },
  "channel": "WhatsApp" | "SMS" | "Email" | "RCS",
  "messageTemplate": "string (The campaign copy. Tailored for the selected channel. MUST include the '[Customer Name]' exact placeholder for name personalization)",
  "aiExplanation": "string (A brief 1-2 sentence explanation of your strategic choices for channel, segment, and messaging)",
  "reasoning": ["string (bullet reasons for the chosen audience)", "string"]
}

Rules:
1. Choose the channel ('WhatsApp', 'SMS', 'Email', 'RCS') that best suits the campaign goal and channel etiquette.
2. In 'filters', only include fields relevant to segmenting based on the user's business goal. If no segment details are mentioned, recommend an appropriate filter based on spend or inactivity.
3. The message copy MUST contain the exact placeholder '[Customer Name]'.
4. Do not include markdown code block formatting like \`\`\`json. Output ONLY raw valid JSON.
5. Current date is ${todayStr}.
`;

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `System instruction:\n${systemInstruction}\n\nUser Business Goal: "${goal}"` }] }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || '';
      const parsed = JSON.parse(responseText.trim());
      return {
        ...parsed,
        aiExplanation: parsed.aiExplanation || 'AI-generated campaign strategy.',
        reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : []
      };
    } catch (error) {
      console.error('❌ Gemini Campaign Agent failed:', error.message);
      return localCampaignAgentMock(goal);
    }
  }
};

// Local mock fallback when Gemini is offline
function localCampaignAgentMock(goal) {
  const query = goal.toLowerCase();
  let city = 'Mumbai';
  let filters = { city: { operator: '=', value: 'Mumbai' } };
  
  if (query.includes('pune')) {
    city = 'Pune';
    filters = { city: { operator: '=', value: 'Pune' } };
  } else if (query.includes('delhi')) {
    city = 'Delhi';
    filters = { city: { operator: '=', value: 'Delhi' } };
  } else if (query.includes('bangalore')) {
    city = 'Bangalore';
    filters = { city: { operator: '=', value: 'Bangalore' } };
  } else if (query.includes('mumbai')) {
    city = 'Mumbai';
    filters = { city: { operator: '=', value: 'Mumbai' } };
  }

  let channel = 'WhatsApp';
  if (query.includes('sms')) channel = 'SMS';
  else if (query.includes('email') || query.includes('mail')) channel = 'Email';
  else if (query.includes('rcs')) channel = 'RCS';

  let productName = 'Wireless Earbuds';
  if (query.includes('keyboard')) productName = 'Mechanical Keyboard';
  else if (query.includes('watch')) productName = 'Smart Watch';
  else if (query.includes('wallet')) productName = 'Leather Wallet';
  else if (query.includes('shoes')) productName = 'Running Shoes';

  const template = `Hi [Customer Name]! 👋 Exclusive promo: get a brand new ${productName} with special store benefits in ${city}! Reply to claim now.`;
  const reasoning = [
    `Selected customers from ${city}`,
    `Promotes ${productName} to a likely high-fit audience`,
    `Uses ${channel} because it matches the campaign urgency and intent`
  ];

  return {
    campaignName: `AI Agent: Promo for ${productName} in ${city}`,
    segmentName: `AI Segment: Residents of ${city}`,
    segmentDescription: `Targeted campaign segment for customers in ${city} based on goal: "${goal}"`,
    filters,
    channel,
    messageTemplate: template,
    aiExplanation: `Selecting ${channel} for higher local conversion. Suggested inventory clearance targeting ${city} residents.`,
    reasoning
  };
}

