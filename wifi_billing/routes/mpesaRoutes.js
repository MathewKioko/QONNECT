const express = require("express");
const axios = require("axios");
const prisma = require("../config/prismaClient");
const { stkPush } = require("../config/mpesa");

const router = express.Router();

// Daraja Mpesa configuration
const DARAJA_BASE_URL = "http://localhost:3000"; // Daraja Mpesa server

// Initiate payment - aligns with Frontend apiClient.initiatePayment
router.post("/payments/initiate", async (req, res) => {
  console.log("Payment initiate request received:", req.body);

  const { phone, amount, macAddress, package: pkg, speed } = req.body || {};

  if (!phone || !amount || !macAddress) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  // Accept +2547XXXXXXXX or 2547XXXXXXXX
  const normalizedPhone = phone.startsWith("+") ? phone.slice(1) : phone;
  if (!/^2547\d{8}$/.test(normalizedPhone)) {
    return res.status(400).json({ success: false, error: "Invalid phone number. Use 2547XXXXXXXX format." });
  }

  const transactionId = `TXN_${Date.now()}`;

  // Create payment record in database
  try {
    await prisma.payment.create({
      data: {
        phone: normalizedPhone,
        amount: Number(amount),
        transactionId,
        macAddress,
        status: "pending"
      }
    });
  } catch (dbError) {
    console.error("Database error creating payment:", dbError);
    return res.status(500).json({ success: false, error: "Database error" });
  }

  // Use real M-Pesa STK Push for sandbox
  console.log(`Initiating real M-Pesa STK Push: Phone: ${normalizedPhone}, Amount: ${amount}`);

  const stkResponse = await stkPush(normalizedPhone, amount, transactionId);

  if (!stkResponse) {
    return res.status(500).json({
      success: false,
      error: 'STK Push failed. No response from M-Pesa API.'
    });
  }

  // Save payment record with checkout request ID
  await prisma.payment.update({
    where: { transactionId },
    data: {
      checkoutRequestId: stkResponse.CheckoutRequestID || null,
    }
  });

  console.log("STK Push initiated successfully for transaction:", transactionId);
  return res.json({
    success: true,
    data: {
      transactionId,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      merchantRequestId: stkResponse.MerchantRequestID,
      status: "pending",
      expiresAt: null,
    },
    message: "STK Push sent! Check your phone for M-Pesa prompt.",
  });
});

// Check payment status - aligns with Frontend apiClient.checkPaymentStatus
router.get("/payments/status/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { transactionId },
      select: { status: true, mpesaRef: true, expiresAt: true }
    });
    if (!payment) {
      return res.json({ success: true, data: { status: "pending", mpesaRef: null, expiresAt: null } });
    }
    return res.json({ success: true, data: {
      status: payment.status || "pending",
      mpesaRef: payment.mpesaRef,
      expiresAt: payment.expiresAt
    }});
  } catch (error) {
    console.error("/payments/status error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch payment status" });
  }
});

module.exports = router;
