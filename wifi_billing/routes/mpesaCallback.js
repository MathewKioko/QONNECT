const express = require("express");
const prisma = require("../config/prismaClient");
const { whitelistMAC } = require("../config/mikrotik");

const router = express.Router();

router.post("/mpesa/callback", async (req, res) => {
  console.log("📲 M-Pesa Callback Received:", JSON.stringify(req.body, null, 2));

  const callbackData = req.body?.Body?.stkCallback;
  const checkoutId = callbackData?.CheckoutRequestID;
  const resultCode = callbackData?.ResultCode;

  if (!callbackData || !checkoutId) {
    return res.status(400).json({ success: false, error: "Invalid callback payload" });
  }

  if (resultCode !== 0) {
    // Mark failed using parameterized query
    try {
      await prisma.payment.updateMany({
        where: { mpesaRef: checkoutId },
        data: { status: "failed" }
      });
      return res.json({ success: false, message: "Payment failed or canceled" });
    } catch (error) {
      console.error("❌ Failed to update payment status:", error);
      return res.status(500).json({ success: false, error: "Failed to update payment status" });
    }
  }

  const amount = callbackData?.CallbackMetadata?.Item?.find((item) => item.Name === "Amount")?.Value;
  const mpesaRef = callbackData?.CallbackMetadata?.Item?.find((item) => item.Name === "MpesaReceiptNumber")?.Value;

  try {
    // Fetch payment using checkoutId
    const payment = await prisma.payment.findFirst({
      where: { mpesaRef: checkoutId },
      include: { user: true }
    });

    if (!payment) {
      console.error("❌ Transaction not found for checkout ID:", checkoutId);
      return res.status(500).json({ success: false, error: "Transaction not found" });
    }

    // Check if this is a loan repayment (transactionId starts with LOAN_REPAY_)
    const isLoanRepayment = payment.transactionId.startsWith('LOAN_REPAY_');

    if (isLoanRepayment) {
      // Handle loan repayment
      const loanId = payment.transactionId.split('_')[2]; // Extract loan ID from LOAN_REPAY_{loanId}_{timestamp}

      // Mark loan as paid
      await prisma.loan.update({
        where: { id: parseInt(loanId) },
        data: {
          status: 'paid',
          paidAt: new Date()
        }
      });

      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "completed",
          mpesaRef: mpesaRef || checkoutId
        }
      });

      console.log(`✅ Loan ${loanId} repaid successfully via M-Pesa`);
      return res.json({ success: true, message: "Loan repayment completed successfully" });
    } else {
      // Handle regular internet package payment
      const mac = payment.macAddress;
      let time = "1Hr";
      if (Number(amount) === 30) time = "24Hrs";
      else if (Number(amount) === 20) time = "12Hrs";
      else if (Number(amount) === 15) time = "4Hrs";

      console.log(`✅ Whitelisting MAC ${mac} for ${time}...`);

      const mikrotikResponse = await whitelistMAC(mac, time);

      if (mikrotikResponse.success) {
        // Update payment status using parameterized query
        const updatedPayment = await prisma.payment.updateMany({
          where: { mpesaRef: checkoutId },
          data: {
            status: "completed",
            mpesaRef: mpesaRef || checkoutId || null,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        });

        // Update user payment history and loan eligibility
        try {
          const payment = await prisma.payment.findFirst({
            where: { mpesaRef: checkoutId },
            select: { phone: true, timePurchased: true }
          });

          if (payment) {
            // Find or create user
            let user = await prisma.user.findUnique({
              where: { phone: payment.phone }
            });

            if (!user) {
              // Create new user if doesn't exist
              user = await prisma.user.create({
                data: {
                  phone: payment.phone,
                  macAddress: mac,
                  status: "active",
                  lastPaymentDate: payment.timePurchased,
                  consecutivePayments: 1
                }
              });
            } else {
              // Update existing user payment history
              const lastPayment = user.lastPaymentDate;
              const currentDate = new Date();
              const daysSinceLastPayment = lastPayment
                ? Math.floor((currentDate - lastPayment) / (1000 * 60 * 60 * 24))
                : 0;

              let newConsecutivePayments = user.consecutivePayments;

              if (daysSinceLastPayment <= 1) {
                // Consecutive payment (same day or next day)
                newConsecutivePayments += 1;
              } else {
                // Reset streak if more than 1 day gap
                newConsecutivePayments = 1;
              }

              // Check loan eligibility (14 consecutive days)
              const loanEligible = newConsecutivePayments >= 14;

              await prisma.user.update({
                where: { phone: payment.phone },
                data: {
                  lastPaymentDate: payment.timePurchased,
                  consecutivePayments: newConsecutivePayments,
                  loanEligible: loanEligible,
                  loanEligibilityDate: loanEligible && !user.loanEligible ? currentDate : user.loanEligibilityDate,
                  totalSpent: { increment: Number(amount) },
                  sessionsCount: { increment: 1 },
                  lastSeen: currentDate
                }
              });
            }
          }
        } catch (userUpdateError) {
          console.error("❌ Error updating user payment history:", userUpdateError);
          // Don't fail the payment for user update errors
        }

        return res.json({ success: true, message: mikrotikResponse.message });
      } else {
        console.error("❌ MikroTik Error:", mikrotikResponse.message);
        return res.status(500).json({ success: false, error: "MikroTik whitelist failed" });
      }
    }
  } catch (error) {
    console.error("❌ Database Error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = router;
