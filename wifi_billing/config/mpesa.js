require("dotenv").config();
const axios = require("axios");
const https = require('https');

const MPESA_ENV = process.env.MPESA_ENV || "sandbox"; // "sandbox" or "production"
const MPESA_BASE_URL = MPESA_ENV === "sandbox" ? "https://sandbox.safaricom.co.ke" : "https://api.safaricom.co.ke";

// ✅ Ensure required env variables are set
const REQUIRED_ENV_VARS = [
    "MPESA_CONSUMER_KEY",
    "MPESA_CONSUMER_SECRET",
    "MPESA_SHORTCODE",
    "MPESA_PASSKEY",
    "MPESA_CALLBACK_URL"
];

for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
        console.error(`❌ Missing environment variable: ${varName}`);
        process.exit(1); // Stop the server if important variables are missing
    }
}

// Create axios instance with proper SSL configuration
const mpesaAxios = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false, // For sandbox, allow self-signed certificates
        keepAlive: true,
        timeout: 30000
    }),
    timeout: 30000,
    headers: {
        'User-Agent': 'wifi-billing-app/1.0',
        'Accept': 'application/json'
    }
});

// Utils from Daraja
function getTimestamp() {
  const date = new Date();
  return date.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function generatePassword(shortcode, passkey, timestamp) {
  return Buffer.from(shortcode + passkey + timestamp).toString('base64');
}

// ✅ Get access token with improved error handling
const getAccessToken = async () => {
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString("base64");

    try {
        console.log("🔐 Requesting M-Pesa access token...");
        const response = await axios.get(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'User-Agent': 'wifi-billing-app/1.0'
            },
            timeout: 30000
        });

        if (response.data && response.data.access_token) {
            console.log("✅ M-Pesa Access Token Obtained Successfully");
            return response.data.access_token;
        } else {
            console.error("❌ Invalid access token response:", response.data);
            return null;
        }
    } catch (error) {
        console.error("❌ M-Pesa Auth Error:");
        console.error("  - Message:", error.message);
        console.error("  - Code:", error.code);
        if (error.response) {
            console.error("  - Status:", error.response.status);
            console.error("  - Status Text:", error.response.statusText);
            console.error("  - Headers:", JSON.stringify(error.response.headers, null, 2));
            console.error("  - Data:", error.response.data);
        } else if (error.request) {
            console.error("  - No response received, request details:", error.request);
        } else {
            console.error("  - Error setting up request:", error.message);
        }
        return null;
    }
};

// ✅ STK Push with improved error handling and retry logic
const stkPush = async (phone, amount, transactionId, retryCount = 0) => {
    const maxRetries = 3;

    console.log(`📩 STK Push Request: Phone: ${phone}, Amount: ${amount}, TransactionID: ${transactionId} (Attempt ${retryCount + 1}/${maxRetries + 1})`);

    const accessToken = await getAccessToken();
    if (!accessToken) {
        console.error("❌ Failed to get M-Pesa access token. STK Push aborted.");
        return null;
    }

    const timestamp = getTimestamp();
    const password = generatePassword(process.env.MPESA_SHORTCODE, process.env.MPESA_PASSKEY, timestamp);

    console.log("🔐 Generated Password:", password);
    console.log("⏰ Timestamp:", timestamp);
    console.log("🔑 Shortcode:", process.env.MPESA_SHORTCODE);

    const payload = {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: "WiFi Payment",
        TransactionDesc: `WiFi Payment - ${transactionId}`
    };

    console.log("📦 STK Push Payload:", JSON.stringify(payload, null, 2));

    try {
        console.log("📤 Sending STK Push...");
        const response = await axios.post(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'User-Agent': 'wifi-billing-app/1.0'
            },
            timeout: 30000
        });

        console.log('✅ STK Push Response:', JSON.stringify(response.data, null, 2));

        if (response.data && response.data.ResponseCode === "0") {
            console.log("✅ STK Push Sent Successfully!");
            return response.data;
        } else {
            console.error("❌ STK Push Failed with ResponseCode:", response.data?.ResponseCode);
            console.error("❌ Response Description:", response.data?.ResponseDescription || response.data?.CustomerMessage);

            // Don't retry for certain error codes
            if (response.data?.ResponseCode === "1" || response.data?.ResponseCode === "2001") {
                console.log("🔄 Retrying STK Push due to temporary error...");
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                    return stkPush(phone, amount, transactionId, retryCount + 1);
                }
            }

            return null;
        }
    } catch (error) {
        console.error("❌ M-Pesa STK Push Error:");
        console.error("  - Message:", error.message);
        console.error("  - Code:", error.code);

        if (error.response) {
            console.error("  - Status:", error.response.status);
            console.error("  - Status Text:", error.response.statusText);
            console.error("  - Headers:", JSON.stringify(error.response.headers, null, 2));
            console.error("  - Data:", error.response.data);
        } else if (error.request) {
            console.error("  - No response received, request details:", error.request);
        } else {
            console.error("  - Error setting up request:", error.message);
        }

        // Retry on network errors
        if (retryCount < maxRetries && (!error.response || error.response.status >= 500)) {
            console.log(`🔄 Retrying STK Push due to network error (attempt ${retryCount + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
            return stkPush(phone, amount, transactionId, retryCount + 1);
        }

        return null;
    }
};

module.exports = { stkPush };
