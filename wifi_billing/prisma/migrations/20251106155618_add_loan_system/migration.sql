-- CreateTable
CREATE TABLE "Loan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME NOT NULL,
    "paidAt" DATETIME,
    "penaltyAmount" INTEGER NOT NULL DEFAULT 0,
    "penaltyAppliedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "phone" TEXT NOT NULL,
    "macAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPackage" TEXT,
    "expiresAt" DATETIME,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "sessionsCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeen" DATETIME,
    "loanEligible" BOOLEAN NOT NULL DEFAULT false,
    "loanEligibilityDate" DATETIME,
    "consecutivePayments" INTEGER NOT NULL DEFAULT 0,
    "lastPaymentDate" DATETIME
);
INSERT INTO "new_User" ("currentPackage", "expiresAt", "id", "lastSeen", "macAddress", "phone", "sessionsCount", "status", "totalSpent") SELECT "currentPackage", "expiresAt", "id", "lastSeen", "macAddress", "phone", "sessionsCount", "status", "totalSpent" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
