# 🤖 GenioAI – AI Chat & Image Platform (Backend)

GenioAI is a powerful AI SaaS platform built in partnership with **Innocode**, allowing users to chat with AI, generate images from prompts, and unlock advanced features through subscription plans.

🎉 **Live App:** [https://app.genio.ae](https://app.genio.ae)  
📄 **API Docs (Swagger):** [https://back-end-api.genio.ae/doc/](https://back-end-api.genio.ae/doc/)

---

## 💡 What is GenioAI?

- 🧠 Conversational AI (OpenAI GPT)
- 🎨 Image generation using text prompts (OpenAI DALL·E)
- 🧾 Role-based access (Free, Plus, Pro plans)
- 🔐 JWT authentication & secure user management
- 🔄 Real-time messaging (Socket.IO)
- 📊 Usage tracking and plan enforcement
- 🧰 Fully documented REST API (Swagger)

---

## 📦 Plans & Permissions

| Plan     | Description                     | Limitations           |
|----------|----------------------------------|------------------------|
| Free     | Explore basic features           | 4 total messages (chat or image) |
| Plus     | Full access with faster response | Unlimited             |
| Pro      | Priority access                  | Unlimited + support   |

---

## 🧰 Backend Tech Stack

| Feature         | Technology             |
|-----------------|------------------------|
| Server          | Node.js + Express      |
| ORM             | Prisma                 |
| Database        | MySQL                  |
| Authentication  | JWT + bcrypt           |
| Realtime Comm.  | Socket.IO              |
| File Uploads    | Multer                 |
| Validation      | Zod                    |
| Documentation   | Swagger                |
| Deployment      | Hostinger VPS via SSH  |

---

## 🔗 Live Resources

- 🌍 **Live App:** [https://app.genio.ae](https://app.genio.ae)
- 📘 **API Docs:** [https://back-end-api.genio.ae/doc/](https://back-end-api.genio.ae/doc/)

---

## 🚀 Getting Started Locally

```bash
git clone https://github.com/BasselSallam2/GenioAI.git
cd GenioAI
npm install
cp .env.example .env
npx prisma generate
npm run dev
