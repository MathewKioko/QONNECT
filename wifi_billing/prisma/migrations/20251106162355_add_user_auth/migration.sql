/*
  Warnings:

  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "name" TEXT,
    "macAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPackage" TEXT,
    "expiresAt" DATETIME,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "sessionsCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeen" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "loanEligible" BOOLEAN NOT NULL DEFAULT false,
    "loanEligibilityDate" DATETIME,
    "consecutivePayments" INTEGER NOT NULL DEFAULT 0,
    "lastPaymentDate" DATETIME
);
INSERT INTO "new_User" ("consecutivePayments", "currentPackage", "expiresAt", "id", "lastPaymentDate", "lastSeen", "loanEligibilityDate", "loanEligible", "macAddress", "phone", "sessionsCount", "status", "totalSpent") SELECT "consecutivePayments", "currentPackage", "expiresAt", "id", "lastPaymentDate", "lastSeen", "loanEligibilityDate", "loanEligible", "macAddress", "phone", "sessionsCount", "status", "totalSpent" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
