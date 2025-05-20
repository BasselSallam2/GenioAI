import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

dotenv.config();

const signupSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[A-Z])(?=.*[!@#$%^&*])/),
  firstname: z.string().min(3),
  lastname: z.string().min(3),
  phonenumber: z.string().regex(/^\d+$/),
});

const resetSchema = z.object({
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[A-Z])(?=.*[!@#$%^&*])/),
});

export const signup = async (req, res, next) => {
  try {
    const { email, password, firstname, lastname, phonenumber } =
      signupSchema.parse(req.body);
    const { confirmpassword, countrycode } = req.body;
    const AdjustedEmail = email.toLowerCase();
    const ReservedAccount = await prisma.user.findUnique({
      where: { email: AdjustedEmail },
    });

    if (ReservedAccount) {
      return res.status(400).json({ message: "Email is already exists" });
    }

    if (password !== confirmpassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const NewUser = await prisma.user.create({
      data: {
        name: `${firstname} ${lastname}`,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phonenumber,
        countrycode: countrycode,
      },
    });

    const paln = await prisma.plan.findUnique({
      where: { name: "free" },
      select: { id: true },
    });
    const subscribtion = await prisma.subscription.create({
      data: {
        userId: NewUser.id,
        planId: paln.id,
      },
    });

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const passwordError = error.errors.find((e) =>
        e.path.includes("password")
      );
      if (passwordError) {
        return res
          .status(400)
          .json({
            message:
              "Password should be at least 8 characters long, contain at least one uppercase letter, and one special character.",
          });
      }
      return res.status(400).json({ errors: error.errors });
    }
    next(error);
  }
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[A-Z])(?=.*[!@#$%^&*])/),
});
export const login = async (req, res, next) => {
  const start = Date.now(); // Track the overall start time of the login process

  try {
    // Track the time for schema validation
    const schemaStart = Date.now();
    const { email, password } = loginSchema.parse(req.body);
    const schemaTime = Date.now() - schemaStart;
    console.log(`Schema validation took ${schemaTime}ms`);

    const AdjustedEmail = email.toLowerCase();

    // Track the time for finding user in the database
    const dbStart = Date.now();
    const user = await prisma.user.findUnique({
      where: { email: AdjustedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        uid: true,
      },
    });
    const dbTime = Date.now() - dbStart;
    console.log(`Database query took ${dbTime}ms`);

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (user.uid) {
      return res
        .status(400)
        .json({ message: "Email is not registered with this method" });
    }

    // Track the time for password comparison
    const bcryptStart = Date.now();
    const isPasswordValid = await bcrypt.compare(password, user.password);
    const bcryptTime = Date.now() - bcryptStart;
    console.log(`Password comparison took ${bcryptTime}ms`);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const JWTPayload = {
      userId: user.id,
      username: user.name,
      email: user.email,
    };

    const JWTsecretKey = process.env.JWT_SECRET;
    const token = jwt.sign(JWTPayload, JWTsecretKey);

    // Track the time for signing the JWT
    const jwtStart = Date.now();
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    const jwtTime = Date.now() - jwtStart;
    console.log(`JWT signing and setting cookie took ${jwtTime}ms`);

    res.status(200).json({ message: "Login successful", token: token });

    const totalTime = Date.now() - start;
    console.log(`Total login process took ${totalTime}ms`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    next(error);
  }
};

export const ResetRequest = async (req, res, next) => {
  try {
    const { email } = req.body;
    const AdjustedEmail = email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: AdjustedEmail },
    });

    if (!user) {
      return res.status(404).json({ message: "No user found with this email" });
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
    const resetExpiry = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: { email: AdjustedEmail },
      data: { resetCode: resetCode, resetexpire: resetExpiry },
    });

    const msg = {
      to: email,
      from: "bassela.sallam@gmail.com",
      subject: "Password Reset",
      text: `You requested a password reset. Please use the following code to reset your password: ${resetCode}`,
      html: `<p>You requested a password reset. Please use the following code to reset your password:</p><p><strong>${resetCode}</strong></p>`,
    };

    // await sgMail.send(msg);

    return res
      .status(200)
      .json({
        message: "Password reset email sent successfully",
        userId: user.id,
      });
  } catch (error) {
    next(error);
  }
};

export const ResetCode = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { ResetCode } = req.body;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    // console.log(userId) ;
    // console.log(ResetCode) ;
    // console.log(user) ;
    // console.log(user.resetCode) ;
    // console.log(user.resetexpire < new Date() );

    if (!user || !user.resetCode || user.resetexpire < new Date()) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    if (user.resetCode !== ResetCode) {
      return res.status(400).json({ message: "Incorrect reset code" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { resetpermession: true },
    });

    res.status(200).json({ message: "Reset code is valid", userId: user.id });
  } catch (error) {
    next(error);
  }
};

export const ResetPassword = async (req, res, next) => {
  try {
    const { password } = resetSchema.parse(req.body);
    const { confirmpassword } = req.body;
    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    console.log(user);

    if (!user) {
      return res.status(404).json({ message: "No user found with this ID" });
    }

    if (password !== confirmpassword) {
      return res.status(404).json({ message: "passwords don't match" });
    }

    if (user.resetpermession !== true) {
      return res.status(404).json({ message: "reset expire" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    console.log(hashedPassword);

    const UpdatePassword = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetexpire: null,
        resetpermession: false,
      },
    });

    res.status(200).json({ message: "reset is Done" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({
          message:
            "Password should be at least 8 characters long, contain at least one uppercase letter, and one special character.",
        });
    }
    res.status(400).json({ errors: error.errors });
    next(error);
  }
};

export const showCode = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { resetCode: true },
    });
    if (!user) {
      return res.status(404).json({ message: "No user found with this ID" });
    }
    if (!user.resetCode) {
      return res.status(404).json({ message: "No reset code found" });
    }
    res.status(200).json({ message: "reset code", resetCode: user.resetCode });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
