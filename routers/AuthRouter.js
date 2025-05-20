import express from "express";
const router = express.Router();
import { login, signup, ResetRequest, ResetCode, ResetPassword , showCode} from "../controller/AuthController.js";


router.post('/signup', signup);

router.post('/login', login);

router.post('/resetRequest', ResetRequest);

router.post('/resetCode/:userId', ResetCode); //

router.post('/reset/:userId', ResetPassword); //

router.get('/showreset/:userId' , showCode) ;

export default router;
