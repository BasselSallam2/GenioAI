import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();


export const validateVoucher = async (req , res , next) => {
    try {
        const {voucher , plan} = req.body;

        if(!voucher || !plan) {
            return res.status(400).json({ error: "Voucher is empty" });
        }



        const Getvoucher = await prisma.voucher.findUnique({ where: { code: voucher } });
        if (!Getvoucher) {
            return res.status(404).json({ error: "Voucher not found" });
        }

        if (Getvoucher.Isactive !== true) {
            return res.status(401).json({ error: "Voucher is deleted" });
        }
        if(Getvoucher.avalibale == Getvoucher.consumed) {
            return res.status(402).json({ error: "Voucher is fully consumed" });
        }

        const planPrice = await prisma.plan.findUnique({where:{ name: plan}, select: { price: true, id: true }});
        let amount = planPrice.price;

        const percentage = Getvoucher.percentage;
        const maximumAmount = Getvoucher.maximumAmount;
        const discount = Math.min((amount * percentage) / 100, maximumAmount);
        amount = amount - discount;
    


        
         res.status(200).json({ message: "Voucher is valid", newcost: amount  , discount: discount , oldcost: planPrice.price});

    }
    catch(error) {
        console.log(error) ;
        next(error) ;
    }
}

export const createVoucher = async (req , res , next) => {
    try {
        let {code , percentage , maximumAmount , avalibale} = req.body ;

        if(!code || !percentage || !maximumAmount || !avalibale) {
            return res.status(400).json({ error: "Voucher is empty" });
        }
        avalibale = +avalibale ;

        const voucher = await prisma.voucher.create({
            data: {
                code: code,
                percentage: percentage,
                maximumAmount: maximumAmount,
                avalibale: avalibale
            }
        });

        res.status(200).json({ message: "Voucher created successfully", voucher });

    } catch (error) {
        console.log(error);
        next(error);
    }
}
