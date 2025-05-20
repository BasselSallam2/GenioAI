import { Server } from "socket.io";
import axios from "axios";
import qs from "querystring";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const url = "https://apichat.genio.ae/chat/";
const imageurl = "https://apimg.genio.ae/generate-image/";
const headers = {
  accept: "application/json",
  "Content-Type": "application/x-www-form-urlencoded",
};
const imageheaders = {
  accept: "application/json",
  "Content-Type": "application/json",
};

export function initializeSocket(server) {
  console.log("🟢 Initializing WebSocket Server...");

  const io = new Server(server, {
    cors: {
      origin: "*", // ✅ Allow all origins (Change in production)
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"], // ✅ Use WebSocket + Polling fallback
  });

  io.on("connection", (socket) => {
    socket.on("userMessage", async (messagee, userid, chatid) => {
      console.log("User message:", messagee);
      console.log("User id:", userid);
      console.log("Chat id:", chatid);

      try {
        const parameter = qs.stringify({
          user_id: "GENIOBACKEND",
          query: `Reply with true only if the user's question = "${messagee}" requires generating an image using AI. If not, reply with false only. Do not provide any explanation or additional text`,
        });

        const isImageResponse = await axios.post(url, parameter, { headers });
        const isImage = isImageResponse.data.response;
        let type;

        if (isImage === "false") {
          type = "message";
          const data = qs.stringify({
            user_id: userid,
            query: `Answer this question "${messagee}" in the same language of the question. If the question is in English, respond in English. If the question is in Arabic, respond in Arabic.`,
          });

          const planmessage = await prisma.subscription.findFirst({
            where: { Isactive: true, userId: userid },
            include: { Plan: { include: { Permissions: true } } },
          });
          const User = await prisma.user.findUnique({ where: { id: userid } });

          if (planmessage.Plan.Permissions.maximumMessages !== -1) {
            if (
              User.messageCounter >=
              planmessage.Plan.Permissions.maximumMessages
            ) {
              const lastdate = User.lastMessgae;
              const limitminits = planmessage.Plan.Permissions.resetMinutes;
              const currentTime = new Date();
              const resetTime = new Date(lastdate);
              resetTime.setMinutes(resetTime.getMinutes() + limitminits);

              if (currentTime > resetTime) {
                await prisma.user.update({
                  where: { id: User.id },
                  data: { messageCounter: 1, lastMessgae: currentTime },
                });
              } else {
                const remainingTime = Math.max(
                  0,
                  Math.ceil((resetTime - currentTime) / 60000)
                );
                return socket.emit("aiMessage", {
                  error: "LIMIT_ERROR",
                  time: remainingTime,
                });
              }
            }

            if (
              User.messageCounter < planmessage.Plan.Permissions.maximumMessages
            ) {
              await prisma.user.update({
                where: { id: User.id },
                data: { messageCounter: { increment: 1 } },
              });
            }
          }

          const response = await axios.post(url, data, { headers });
          const answer = response.data.response;

          socket.emit("aiMessage", answer, type);
          // console.log("AI answer:", answer);

          let chatID = await prisma.chat.findUnique({
            where: { userId: userid, id: chatid },
          });
          console.log("Chat ID:", chatID);

          if (!chatID) {
            const summrize = qs.stringify({
              user_id: "Developer",
              query: `please summry this question "${messagee}" as a title of the qustion maximum 5 words in the same languge of the question If the question is in English, respond in English. If the question is in Arabic, respond in Arabic. `,
            });

            const response2 = await axios.post(url, summrize, { headers });
            const answer2 = response2.data.response;

            const newChat = await prisma.chat.create({
              data: {
                id: chatid,
                userId: userid,
                name: answer2,
                Histories: {
                  create: { question: messagee, answer: answer, type: type },
                },
              },
            });
          } else {
            const chat = await prisma.chat.findUnique({
              where: { id: chatid, userId: userid },
            });
            if (chat) {
              console.log("Chat found:", chat);
              const history = await prisma.history.create({
                data: {
                  chatId: chat.id,
                  question: messagee,
                  answer: answer,
                  type: type,
                },
              });
            }
          }
        } else if (isImage === "true") {
          type = "image" ;
          const queryImage = {
            prompt:messagee,
            model: "flux",
            width: 1024,
            height: 1024,
            seed: Math.floor(Math.random() * 1000000),
            nologo: true,
            private: true,
            enhance: true,
            safe: true,
          };
          console.log("Image in progress ..");

          const response = await axios.post(imageurl, queryImage, {
            headers: imageheaders,
            responseType: "arraybuffer",
          });

          console.log("image is created");

          const bufferImage = Buffer.isBuffer(response.data)
            ? response.data
            : Buffer.from(response.data);

          const base64Image = bufferImage.toString("base64");

          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);

          const filename = `${Date.now()}.png`;
          const filePath = path.join(
            __dirname,
            "../",
            "public",
            "chatImage",
            filename
          );

          await fs.writeFile(filePath, bufferImage);

          socket.emit("aiMessage", filename, type);

          let chatID = await prisma.chat.findUnique({
            where: { userId: userid, id: chatid },
          });

          if(!chatID) {

            const summrize = qs.stringify({
              user_id: "Developer",
              query: `please summry this question "${messagee}" as a title of the qustion maximum 5 words in the same languge of the question If the question is in English, respond in English. If the question is in Arabic, respond in Arabic. `,
            });

            const response2 = await axios.post(url, summrize, { headers });
            const answer2 = response2.data.response;

            const newChat = await prisma.chat.create({
              data: {
                id: chatid,
                userId: userid,
                name: answer2,
                Histories: {
                  create: { question: messagee, image:filename , type: type },
                },
              },
            });
          } else {
            const chat = await prisma.chat.findUnique({
              where: { id: chatid, userId: userid },
            });
            if (chat) {
              console.log("Chat found:", chat);
              const history = await prisma.history.create({
                data: {
                  chatId: chat.id,
                  question: messagee,
                  image:filename,
                  type: type,
                },
              });
            }
          }
        }
      } catch (error) {
        console.error("Error:", error);
        socket.emit(
          "aiMessage",
          "An error occurred while processing your message."
        );
      }
    });

    socket.on("generateImageFullControll", async (data, userid) => {
      console.log("User message:", data);
      console.log("User id:", userid);
      try {
        const query = {
          ...data,
          seed: Math.floor(Math.random() * 1000000),
          nologo: true,
          private: true,
          enhance: true,
          safe: true,
        };

        console.log("Image in progress ..");

        const response = await axios.post(imageurl, query, {
          headers: imageheaders,
          responseType: "arraybuffer",
        });

        console.log("image is created");

        const bufferImage = Buffer.isBuffer(response.data)
          ? response.data
          : Buffer.from(response.data);

        const base64Image = bufferImage.toString("base64");

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const filename = `${Date.now()}.png`;
        const filePath = path.join(
          __dirname,
          "../",
          "public",
          "chatImage",
          filename
        );

        await fs.writeFile(filePath, bufferImage);

        socket.emit("aiImageAnswer", filename);

        let gallary = await prisma.imageGallary.findUnique({
          where: { userId: userid },
        });
        if (!gallary) {
          gallary = await prisma.imageGallary.create({
            data: {
              userId: userid,
            },
          });
        }

        await prisma.generatedImages.create({
          data: {
            gallaryId: gallary.id,
            image: filename,
            model: data.model,
            width: data.width.toString(),
            height: data.height.toString(),
          },
        });
      } catch (error) {
        console.error("Error:", error);
        socket.emit(
          "aiImage",
          "An error occurred while processing your message."
        );
      }
    });
  });

  return io;
}
