const bcrypt = require("bcryptjs");
const prisma = require("../config/prismaClient");

const email = "kiokomathew1985@gmail.com";  // Corrected email
const password = "Mat2018"; // Updated to provided password

async function createAdmin() {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        console.log("Generated Hashed Password:", hashedPassword); // Debugging log

        // Delete existing admin if exists
        await prisma.admin.deleteMany({ where: { email } });

        await prisma.admin.create({
            data: {
                email,
                password: hashedPassword
            }
        });
        console.log("Admin added successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error hashing password:", error);
        process.exit(1);
    }
}

createAdmin();
