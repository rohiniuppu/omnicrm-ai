// Helper data for generating realistic mock data
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow'];
const PRODUCTS = [
  'Wireless Earbuds', 'Mechanical Keyboard', 'Smart Watch', 'Leather Wallet', 
  'Insulated Water Bottle', 'Running Shoes', 'Ceramic Coffee Mug', 'Ergonomic Gaming Mouse', 
  'Travel Backpack', 'Felt Desk Pad', 'LED Desk Lamp', 'Adjustable Phone Stand', 
  'Fast Wireless Charger', 'Bluetooth Speaker', 'Notebook & Pen Set'
];
const FIRST_NAMES = ['Aarav', 'Vihaan', 'Vivaan', 'Ananya', 'Diya', 'Ishaan', 'Kabir', 'Neha', 'Rohan', 'Siddharth', 'Aditi', 'Rahul', 'Pooja', 'Amit', 'Sunita', 'Vikram', 'Priya', 'Sanjay', 'Deepa', 'Arjun', 'Meera', 'Karan', 'Shruti', 'Deepak', 'Nisha'];
const LAST_NAMES = ['Sharma', 'Verma', 'Gupta', 'Mehta', 'Joshi', 'Patel', 'Rao', 'Nair', 'Singh', 'Kumar', 'Reddy', 'Choudhury', 'Das', 'Sen', 'Banerjee', 'Mishra', 'Trivedi', 'Shah', 'Iyer', 'Pillai'];

export function generateSeedData() {
  const customers = [];
  const orders = [];
  
  let orderIdCounter = 1;

  for (let i = 1; i <= 120; i++) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@example.com`;
    const phone = `+91 ${9000000000 + Math.floor(Math.random() * 999999999)}`;
    const city = CITIES[Math.floor(Math.random() * CITIES.length)];

    // Generate random number of orders (0 to 10)
    const numOrders = Math.floor(Math.random() * 9) + 1; // 1 to 9 orders
    let totalSpend = 0;
    let lastPurchaseDate = null;
    const customerOrders = [];

    for (let j = 0; j < numOrders; j++) {
      const amount = parseFloat((Math.random() * 4500 + 200).toFixed(2)); // ₹200 to ₹4700
      totalSpend += amount;
      
      // Random date in the last 180 days
      const daysAgo = Math.floor(Math.random() * 180);
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - daysAgo);

      if (!lastPurchaseDate || orderDate > lastPurchaseDate) {
        lastPurchaseDate = orderDate;
      }

      const productName = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
      
      customerOrders.push({
        id: orderIdCounter++,
        customer_id: i,
        amount,
        date: orderDate.toISOString(),
        product_name: productName
      });
    }

    // Format total_spend
    totalSpend = parseFloat(totalSpend.toFixed(2));

    customers.push({
      id: i,
      name,
      email,
      phone,
      city,
      total_spend: totalSpend,
      order_count: numOrders,
      last_purchase_date: lastPurchaseDate ? lastPurchaseDate.toISOString() : null,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 190).toISOString() // Created 190 days ago
    });

    orders.push(...customerOrders);
  }

  // Generate some base segments
  const segments = [
    {
      id: 1,
      name: "High Spenders (Mumbai)",
      description: "Customers in Mumbai who spent more than ₹5000",
      filters: JSON.stringify({
        total_spend: { operator: ">", value: 5000 },
        city: { operator: "=", value: "Mumbai" }
      }),
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      name: "Inactive Customers (Last 30 Days)",
      description: "Customers who haven't made a purchase in the last 30 days",
      filters: JSON.stringify({
        last_purchase_date: { operator: "<", value: 30 } // days ago
      }),
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      name: "Loyal Shoppers (3+ Orders)",
      description: "Customers who have placed 3 or more orders",
      filters: JSON.stringify({
        order_count: { operator: ">=", value: 3 }
      }),
      created_at: new Date().toISOString()
    }
  ];

  return { customers, orders, segments };
}
