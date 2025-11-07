const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUserLoanEligibility() {
  try {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: 'test2@example.com' }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('Found user:', user.name, user.email);

    // Update user to be loan eligible with 14+ consecutive payments
    const updatedUser = await prisma.user.update({
      where: { email: 'test2@example.com' },
      data: {
        loanEligible: true,
        consecutivePayments: 15, // Set to 15 to exceed the 14 requirement
        loanEligibilityDate: new Date(),
        lastPaymentDate: new Date() // Set recent payment date
      }
    });

    console.log('Updated user loan eligibility:', updatedUser);

    // Close the database connection
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error updating user:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updateUserLoanEligibility();