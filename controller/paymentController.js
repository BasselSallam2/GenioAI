import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";
import exp from "constants";
dotenv.config();

const paymnet_API = process.env.PAYMENT_API;
const redirectUrl = process.env.PAYMNET_REDIRECT_URL;
const allowedcurrency = ["EGP", "USD", "SAR", "EUR"];

export const newPayment = async (req, res, next) => {
  try {
    const {
      plan,
      userId,
      voucher,
      email,
      firstname,
      lastname,
      countrycode,
      phone,
      currency,
    } = req.body;

    if (
      !userId ||
      !email ||
      !firstname ||
      !lastname ||
      !countrycode ||
      !phone
    ) {
      return res
        .status(400)
        .json({ error: "Missing required user information" });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(400).json({ error: "Invalid user" });
    }

    if (!plan || plan.length === 0) {
      return res.status(400).json({ error: "No plan provided" });
    }

    if (
      !currency ||
      currency.length == 0 ||
      !allowedcurrency.includes(currency)
    ) {
      return res.status(400).json({ error: "Invalid or unsupported currency" });
    }

    const planPrice = await prisma.plan.findUnique({
      where: { name: plan },
      select: { price: true, id: true },
    });
    if (!planPrice) {
      return res.status(400).json({ error: "Invalid plan name" });
    }
    let amount = planPrice.price;

    let usedVoucher;

    if (voucher && voucher.length > 0) {
      usedVoucher = await prisma.voucher.findUnique({
        where: { code: voucher, Isactive: true },
      });
      if (!usedVoucher) {
        return res.status(400).json({ error: "Invalid voucher" });
      }
      if (usedVoucher.avalibale === usedVoucher.consumed) {
        return res.status(400).json({ error: "Voucher is expired" });
      }
      const percentage = usedVoucher.percentage;
      const maximumAmount = usedVoucher.maximumAmount;
      const discount = Math.min((amount * percentage) / 100, maximumAmount);
      amount = amount - discount;
    }

    const temppayment = await prisma.tempPayment.create({
      data: {
        plan: planPrice.id,
        voucher: usedVoucher ? usedVoucher.id : null,
        userId: userId,
      },
    });

    const response = await axios.post(
      "https://back.easykash.net/api/directpayv1/pay",
      {
        amount: amount,
        currency: currency,
        paymentOptions: [1, 2, 3, 4, 5, 6, 8, 9, 17, 18, 19, 27, 28],
        cashExpiry: 3,
        name: `${firstname} ${lastname}`,
        email: email,
        mobile: `${countrycode}${phone}`,
        redirectUrl: redirectUrl,
        customerReference: temppayment.id,
      },
      {
        headers: {
          Authorization: paymnet_API,
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const callback = async (req, res, next) => {
  try {
    console.log(req.body);
    const {
      customerReference,
      status,
      Amount,
      ProductType,
      PaymentMethod,
      easykashRef,
      signatureHash,
    } = req.body;
    if (status !== "PAID") {
      return res.status(400).json({ error: "Payment not completed" });
    }
    if (!customerReference) {
      return res
        .status(400)
        .json({ error: "Customer reference must be provided" });
    }
    const payment = await prisma.tempPayment.findUnique({
      where: { id: customerReference },
    });
    if (!payment) {
      return res.status(400).json({ error: "Invalid payment reference" });
    }
    const sub = await prisma.subscription.findFirst({
      where: { userId: payment.userId, Isactive: true },
    });
    if (!sub) {
      return res.status(400).json({ error: "No active subscription found" });
    }

    await prisma.voucher.update({
      where: { id: payment.voucher },
      data: { consumed: { increment: 1 } },
    });

    await prisma.tempPayment.delete({
      where: { id: customerReference },
    });

    await prisma.subscription.update({
      where: { id: sub.id, Isactive: true, userId: payment.userId },
      data: { Isactive: false },
    });
    await prisma.subscription.create({
      data: {
        userId: payment.userId,
        planId: payment.plan,
        voucherId: payment.voucher,
        paymentmethod: PaymentMethod,
        easykaschrefrence: easykashRef,
        amount: Amount,
        producttype: ProductType,
        signturehash: signatureHash,
      },
    });
    res.status(200).json({ message: "Payment is completed successfully" });
  } catch (error) {
    console.log(error);
    next(error);
  }
};


export const getpaymentCost = async (req, res, next) => {
  try {
    const planPrice = await prisma.plan.findMany({
      select: { price: true, id: true , name: true },
    });
    if (!planPrice) {
      return res.status(404).json({ error: "Plans can not found" });
    }

    const plans = planPrice.map((plan) => {
      return { [plan.name.replace(/\s+/g, "")]: plan.price };
    });
    console.log(plans);

   


    res.status(200).json(plans);
  }
  catch(error) {
    console.log(error);
    next(error);
  }
}