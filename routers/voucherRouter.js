import express from "express"
const router = express.Router();
import {authenticateUser} from "../middleware/Authentication.js"
import {validateVoucher , createVoucher} from "../controller/voucherController.js"

router.post("/voucher" , authenticateUser , validateVoucher ) ;
router.post("/createvoucher" , authenticateUser , createVoucher ) ;


export default router;