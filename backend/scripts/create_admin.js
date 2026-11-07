require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/user");
const createAdmin = async () => {
    try {
        await mongoose.connect(
            process.env.MONGO_URI
        );
        console.log(
            "Connected to MongoDB."
        );
        const adminEmail =
            "   @admin.in";
        const adminPassword =
            "rudra034";
        const existingAdmin =
            await User.findOne({
                email: adminEmail
            });
        if (existingAdmin) {
            console.log(
                "Admin account already exists."
            );
            process.exit(0);
        }
        const hashedPassword =
            await bcrypt.hash(
                adminPassword,
                10
            );
        await User.create({
            name:
                "SENETRY Administrator",
            email:
                adminEmail,
            password:
                hashedPassword,
            phone:
                "0000000000",
            role:
                "admin",
            location: {
                state:
                    "System",
                district:
                    "Administration"
            },
            authorityStatus:
                "not_applicable"
        });
        console.log(
            "================================="
        );
        console.log(
            "ADMIN ACCOUNT CREATED"
        );
        console.log(
            "Email:",
            adminEmail
        );
        console.log(
            "Password:",
            adminPassword
        );
        console.log(
            "================================="
        );
        process.exit(0);
    } catch (error) {
        console.error(
            "Admin creation failed:",
            error
        );
        process.exit(1);
    }
};
createAdmin();