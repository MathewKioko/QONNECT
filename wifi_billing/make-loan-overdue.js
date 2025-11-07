const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function makeLoanOverdue() {
  try {
    // Update the loan to be overdue (set due date to yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const updatedLoan = await prisma.loan.update({
      where: { id: 1 },
      data: {
        dueDate: yesterday,
        status: 'active' // Make sure it's active
      }
    });

    console.log('Loan made overdue:', updatedLoan);

    // Close the database connection
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error making loan overdue:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

makeLoanOverdue();