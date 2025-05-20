import express from "express"
const router = express.Router();
import {authenticateUser} from "../middleware/Authentication.js"
import {newPayment , callback , getpaymentCost} from "../controller/paymentController.js"

router.post("/payment"  , authenticateUser , newPayment) ;
router.post("/payment/callback"  , callback) ;
router.get("/payment/cost" , getpaymentCost) ;


export default router;