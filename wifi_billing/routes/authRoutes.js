const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prismaClient");

const router = express.Router();

// User registration
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate phone format
    if (!/^(07|01)\d{8}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { phone: phone }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: "User with this email or phone already exists" });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        macAddress: "00:00:00:00:00:00", // Default MAC, will be updated on first payment
        status: "active"
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// User login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: "user"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        loanEligible: user.loanEligible,
        consecutivePayments: user.consecutivePayments
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user profile
router.get("/profile", authenticateUser, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        macAddress: true,
        status: true,
        currentPackage: true,
        expiresAt: true,
        totalSpent: true,
        sessionsCount: true,
        lastSeen: true,
        loanEligible: true,
        loanEligibilityDate: true,
        consecutivePayments: true,
        lastPaymentDate: true,
        loans: {
          where: { status: { in: ['active', 'overdue'] } },
          select: {
            id: true,
            amount: true,
            status: true,
            dueDate: true,
            penaltyAmount: true,
            grantedAt: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user profile
router.put("/profile", authenticateUser, async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Change password
router.put("/change-password", authenticateUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password are required" });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user || !user.password) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword }
    });

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Middleware to authenticate users
function authenticateUser(req, res, next) {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const tokenValue = token.replace("Bearer ", "");
    const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);

    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({ error: "Token has expired." });
    }

    if (decoded.role !== "user") {
      return res.status(403).json({ error: "Access denied. User token required." });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token." });
  }
}

module.exports = { router, authenticateUser };