import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import exp from "constants";
dotenv.config();
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "public", "images"),
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

const passwordSchema = z.object({
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[A-Z])(?=.*[!@#$%^&*])/),
});

const editSchema = z.object({
  email: z.string().email(),
  name: z.string().min(6),
});

export const GetUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({ where: { Isactive: true } });
    if (!users) {
      return res.status(404).json({ message: "No users found" });
    }

    return res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

export const GetUser = async (req, res, next) => {
  try {
    const { userId } = req.user;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        phone: true,
        countrycode: true,
        image: true,
      },
    });
    if (!user) {
      return res.status(404).json({ message: "No user found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const DeleteUser = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "No user found" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    return res.status(200).json({ message: "User deactivated successfully" });
  } catch (error) {
    next(error);
  }
};

export const editUser = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { name, email } = editSchema.parse(req.body);
    const { phone, countrycode } = req.body;

    if (!name || !email || !phone || !countrycode) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name,
        email: email,
        phone: phone,
        countrycode: countrycode,
      },
    });
    res.status(201).json({ message: "user profile is updated" });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const editPassword = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { password } = passwordSchema.parse(req.body);
    const { confirmpassword } = req.body;

    if (password !== confirmpassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    res.status(201).json({ message: "Password is updated successfully" });
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

export const editImage = async (req, res, next) => {
  try {
    const { userId } = req.user;
    let image;

    await new Promise((resolve, reject) => {
      upload.single("image")(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    if (!req.file) {
      return res.status(400).json({ message: "Please upload an image" });
    }

    image = req.file.filename;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.image) {
      const oldImagePath = path.join(
        __dirname,
        "..",
        "public",
        "images",
        user.image
      );
      fs.unlink(oldImagePath, (err) => {
        if (err) {
          console.error("Error deleting old image:", err);
        }
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { image: `https://back-end-api.genio.ae/images/${image}` },
    });

    res.status(200).json({ message: "Image is uploaded successfully" });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const getChats = async (req, res, next) => {
  try {
    const { userId } = req.user;

    const chats = await prisma.chat.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
      select: { name: true, id: true, createdAt: true },
    });

    res.status(200).json(chats);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const getChatHistory = async (req, res, next) => {
  try {
    const { chat_id } = req.params;
    const { userId } = req.user;
    
    if(!chat_id) {
      return res.status(400).json({ message: "Please enter chat ID" });
    }

    const chat = await prisma.chat.findUnique({ where: { id: chat_id } });

    if (!chat) {
      return res.status(404).json({ message: "Chat does not exist" });
    }

    if (chat.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const history = await prisma.history.findMany({
      where: { chatId: chat_id },
      orderBy: { createdAt: "asc" },
      select: {
        question: true,
        answer: true,
        createdAt: true,
        type: true,
        image: true,
      },
    });

    res.status(200).json(history);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const userCurrentPlan = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const currentplan = await prisma.subscription.findFirst({
      where: { userId: userId, Isactive: true },
      include: { Plan: true },
    });
    if (!currentplan) {
      return res
        .status(404)
        .json({ message: "No active subscription found for the user" });
    }
    res.status(200).json({ plan: currentplan.Plan.name });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const getUserID = async (req, res, next) => {
  try {
    const { userId } = req.user;
    res.status(200).json({ userId });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const getGallery = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, ImageGallaryId: true },
    });
    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }
    if (!user.ImageGallaryId) {
      return res.status(200).json([]);
    }

    const gallery = await prisma.generatedImages.findMany({
      where: { gallaryId: user.ImageGallaryId.id },
      select: { image: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json(gallery);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
