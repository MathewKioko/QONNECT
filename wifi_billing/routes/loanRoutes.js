const express = require("express");
const prisma = require("../config/prismaClient");
const { stkPush } = require("../config/mpesa");
const { authenticateUser } = require("./authRoutes");

const router = express.Router();

// Middleware to check admin access
const requireAdmin = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    const tokenValue = token.replace("Bearer ", "");
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token." });
  }
};

// Get user's loan eligibility and status
router.get("/user/eligibility/:phone", async (req, res) => {
  try {
    const { phone } = req.params;

    const user = await prisma.user.findUnique({
      where: { phone },
      select: {
        loanEligible: true,
        loanEligibilityDate: true,
        consecutivePayments: true,
        loans: {
          where: { status: { in: ['active', 'overdue'] } },
          select: {
            id: true,
            amount: true,
            status: true,
            dueDate: true,
            penaltyAmount: true
          }
        }
      }
    });

    if (!user) {
      return res.json({ eligible: false, reason: "User not found" });
    }

    const hasActiveLoan = user.loans.some(loan => loan.status === 'active' || loan.status === 'overdue');

    res.json({
      eligible: user.loanEligible && !hasActiveLoan,
      consecutivePayments: user.consecutivePayments,
      eligibilityDate: user.loanEligibilityDate,
      hasActiveLoan,
      activeLoan: hasActiveLoan ? user.loans[0] : null
    });
  } catch (error) {
    console.error("Error checking loan eligibility:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Request a loan (user endpoint)
router.post("/request", authenticateUser, async (req, res) => {
  try {
    const { amount } = req.body;

    // Validate amount (reasonable loan amounts)
    if (amount < 10 || amount > 100) {
      return res.status(400).json({ error: "Loan amount must be between Ksh 10 and Ksh 100" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        loans: {
          where: { status: { in: ['active', 'overdue'] } }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.loanEligible) {
      return res.status(403).json({ error: "User not eligible for loans" });
    }

    if (user.loans.length > 0) {
      return res.status(400).json({ error: "User already has an active loan" });
    }

    // Create loan request (will be approved by admin)
    const loan = await prisma.loan.create({
      data: {
        userId: user.id,
        amount: amount,
        status: 'active', // Auto-approve for now, can be changed to 'pending' for manual approval
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      }
    });

    res.json({
      success: true,
      loan: {
        id: loan.id,
        amount: loan.amount,
        dueDate: loan.dueDate,
        status: loan.status
      }
    });
  } catch (error) {
    console.error("Error requesting loan:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Repay loan
router.post("/repay/:loanId", authenticateUser, async (req, res) => {
  try {
    const { loanId } = req.params;

    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(loanId) },
      include: { user: true }
    });

    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    if (loan.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (loan.status === 'paid') {
      return res.status(400).json({ error: "Loan already paid" });
    }

    // Calculate total amount due (loan + penalty)
    const totalDue = loan.amount + loan.penaltyAmount;

    // Generate transaction ID for loan repayment
    const transactionId = `LOAN_REPAY_${loanId}_${Date.now()}`;

    // Create payment record for loan repayment
    const payment = await prisma.payment.create({
      data: {
        phone: loan.user.phone,
        amount: totalDue,
        transactionId: transactionId,
        macAddress: loan.user.macAddress,
        status: "pending",
        mpesaRef: transactionId, // Use transactionId as initial mpesaRef
        userId: loan.userId
      }
    });

    // Initiate M-Pesa STK Push for loan repayment
    const phoneNumber = loan.user.phone.startsWith('0') ? `254${loan.user.phone.substring(1)}` : loan.user.phone;
    const stkPushResult = await stkPush(phoneNumber, totalDue, transactionId);

    if (!stkPushResult) {
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "failed" }
      });
      return res.status(500).json({ error: "Failed to initiate M-Pesa payment" });
    }

    res.json({
      success: true,
      message: `M-Pesa payment initiated for Ksh ${totalDue}. Please complete payment on your phone.`,
      transactionId: transactionId,
      checkoutRequestId: stkPushResult.CheckoutRequestID
    });
  } catch (error) {
    console.error("Error repaying loan:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: Get all loans
router.get("/admin/all", requireAdmin, async (req, res) => {
  try {
    const loans = await prisma.loan.findMany({
      include: {
        user: {
          select: { phone: true, consecutivePayments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, loans });
  } catch (error) {
    console.error("Error fetching loans:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: Update loan penalty (run daily)
router.post("/admin/update-penalties", requireAdmin, async (req, res) => {
  try {
    const overdueLoans = await prisma.loan.findMany({
      where: {
        status: 'active',
        dueDate: { lt: new Date() }
      }
    });

    for (const loan of overdueLoans) {
      const daysOverdue = Math.floor((new Date() - loan.dueDate) / (1000 * 60 * 60 * 24));

      if (daysOverdue > 0) {
        // Triple the penalty each day overdue
        const newPenalty = loan.penaltyAmount + (loan.amount * 3);

        await prisma.loan.update({
          where: { id: loan.id },
          data: {
            penaltyAmount: newPenalty,
            status: 'overdue',
            penaltyAppliedAt: new Date()
          }
        });
      }
    }

    res.json({
      success: true,
      message: `Updated penalties for ${overdueLoans.length} loans`
    });
  } catch (error) {
    console.error("Error updating penalties:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: Mark loan as defaulted (after extended period)
router.post("/admin/default/:loanId", requireAdmin, async (req, res) => {
  try {
    const { loanId } = req.params;

    await prisma.loan.update({
      where: { id: parseInt(loanId) },
      data: { status: 'defaulted' }
    });

    res.json({ success: true, message: "Loan marked as defaulted" });
  } catch (error) {
    console.error("Error defaulting loan:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;