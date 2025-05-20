import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import http from "http"; 
import { initializeSocket } from "./socket/socket.js";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient } from "@prisma/client";
import swaggerUi from 'swagger-ui-express';
const prisma = new PrismaClient();


import ErrorHandler from "./middleware/ErrorHandler.js";
import { authenticateUser } from "./middleware/Authentication.js";

import AuthRouter from "./routers/AuthRouter.js";
import UserRouter from "./routers/userRouter.js";
import PaymentRouter from "./routers/paymentRouter.js"
import VoucherRouter from "./routers/voucherRouter.js"


dotenv.config();
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app); 
const __filename = fileURLToPath(import.meta.url); 
const __dirname = path.dirname(__filename);


  initializeSocket(server);






app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


const swaggerDocument = JSON.parse(fs.readFileSync(path.join(__dirname, 'swagger.json'), 'utf8'));


app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Routes
app.get("/api/health", (req, res) => {
  res.send({ message: "Server is Working" });
});

app.use("/api/protected", authenticateUser, (req, res) => {
  res.send("Authenticated");
});

// (async () => {
//   const free = await prisma.plan.create({data:{
//     name:"free" , price:0 ,Permissions:{create:{maximumMessages:4 , resetMinutes:5}}
//   }})

//   const plus = await prisma.plan.create({data:{
//     name:"plus" , price:20 ,Permissions:{create:{maximumMessages:1000000000 , resetMinutes:0}}
//   }})

  
//   const superplus = await prisma.plan.create({data:{
//     name:"superplus" , price:200 ,Permissions:{create:{maximumMessages:1000000000 , resetMinutes:0}}
//   }})

// })() ;



// app.get("/api/test-image", async (req, res) => {
//   try {
//     const image = await prisma.image.findFirst();

//     if (!image) {
//       return res.status(404).send({ message: "No image found." });
//     }

//     // Force Uint8Array to real Buffer if needed
//     const buffer = Buffer.isBuffer(image.image) ? image.image : Buffer.from(image.image);

//     res.set('Content-Type', 'image/jpeg');
//     res.set('Content-Length', buffer.length);
//     res.send(buffer);  // send real Buffer, not JSON
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ message: "An error occurred while fetching the image." });
//   }
// });


app.use("/api", AuthRouter);
app.use("/api", UserRouter);
app.use("/api" , PaymentRouter) ;
app.use("/api" , VoucherRouter) ;
// 404 Handler
app.use((req, res, next) => {
  res.status(404).send({ message: "Not Found" });
});


app.use(ErrorHandler);



server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});


export default app;
