import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const CRM_CALLBACK_URL = process.env.CRM_CALLBACK_URL || 'http://localhost:5000/api/webhooks/channel-callback';

app.use(cors());
app.use(express.json());

console.log(`📡 Callback webhook target configured to: ${CRM_CALLBACK_URL}`);

// Simulate a status state machine for a specific communication
function simulateDeliveryPipeline(communicationId, channel, name) {
  // Random latency between 1.5s and 3.5s
  const randomDelay = (min, max) => Math.floor(Math.random() * (max - min) + min) * 1000;

  // Step 1: Transition to DELIVERED or FAILED
  setTimeout(() => {
    const isDelivered = Math.random() > 0.15; // 85% success rate
    const finalStatus = isDelivered ? 'DELIVERED' : 'FAILED';
    
    console.log(`[SIMULATOR] Comm #${communicationId} to "${name}" -> ${finalStatus}`);
    
    triggerCallback(communicationId, finalStatus);

    if (isDelivered) {
      // Step 2: Transition to OPENED (if delivered)
      setTimeout(() => {
        const isOpened = Math.random() > 0.35; // 65% open rate
        if (isOpened) {
          console.log(`[SIMULATOR] Comm #${communicationId} to "${name}" -> OPENED 🔓`);
          triggerCallback(communicationId, 'OPENED');

          // Step 3: Transition to CLICKED (if opened)
          setTimeout(() => {
            const isClicked = Math.random() > 0.60; // 40% click rate
            if (isClicked) {
              console.log(`[SIMULATOR] Comm #${communicationId} to "${name}" -> CLICKED 🖱️`);
              triggerCallback(communicationId, 'CLICKED');

              // Step 4: Transition to CONVERTED (Purchase) with random probability (20% - 50%)
              const purchaseProb = Math.random() * 0.3 + 0.2; // 20% to 50% conversion chance
              const isConverted = Math.random() < purchaseProb;

              if (isConverted) {
                setTimeout(() => {
                  console.log(`[SIMULATOR] Comm #${communicationId} to "${name}" -> CONVERTED (Purchased!) 🛍️ [Attributed at ${(purchaseProb * 100).toFixed(0)}% Probability]`);
                  triggerCallback(communicationId, 'CONVERTED');
                }, randomDelay(2.5, 4.5));
              }
            }
          }, randomDelay(2, 4));
        }
      }, randomDelay(2, 5));
    }
  }, randomDelay(1.5, 3));
}

// Function to call the CRM Webhook
async function triggerCallback(communicationId, status) {
  try {
    const response = await fetch(CRM_CALLBACK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        communication_id: communicationId,
        status: status
      })
    });
    
    if (!response.ok) {
      console.error(`[SIMULATOR ERROR] Callback returned status ${response.status} for Comm #${communicationId}`);
    }
  } catch (error) {
    console.error(`[SIMULATOR ERROR] Callback failed to hit CRM backend:`, error.message);
  }
}

app.post('/send-message', (req, res) => {
  const { communication_id, customer_name, channel, message } = req.body;
  
  if (!communication_id) {
    return res.status(400).json({ error: 'communication_id is required' });
  }

  console.log(`\n📬 [SIMULATOR] Received message request:`);
  console.log(`   - ID: ${communication_id}`);
  console.log(`   - Recipient: ${customer_name}`);
  console.log(`   - Channel: ${channel}`);
  console.log(`   - Message: "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}"`);

  // Respond immediately with SENT status acknowledgement
  res.json({
    status: 'SENT',
    communication_id,
    message_id: `sim-msg-${Math.random().toString(36).substring(2, 11)}`
  });

  // Start the asynchronous lifecycle simulation
  simulateDeliveryPipeline(communication_id, channel, customer_name);
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`📡 Channel Service Simulator active on port ${PORT}`);
  console.log(`📞 Accepting POST /send-message requests`);
  console.log(`==================================================`);
});
