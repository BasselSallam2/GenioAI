import express from "express"
const router = express.Router();
import {GetUsers , GetUser , DeleteUser , editPassword , editUser , editImage , getChats , getChatHistory , userCurrentPlan , getUserID , getGallery} from "../controller/userController.js"
import {authenticateUser} from "../middleware/Authentication.js"



router.get('/user' ,authenticateUser , GetUsers) ;

router.get('/user/id' , authenticateUser , getUserID) ;

router.get('/user/profile' , authenticateUser ,GetUser) ;


router.delete('/user' , authenticateUser , DeleteUser);


router.put('/user/edit' , authenticateUser , editUser ) ;

router.patch('/user/edit/password' , authenticateUser , editPassword) ;

router.patch('/user/edit/image' ,  authenticateUser , editImage) ;

router.get('/user/chat' , authenticateUser , getChats) ;

router.get('/user/chat/:chat_id' , authenticateUser , getChatHistory) ;

router.get('/user/currentplan' , authenticateUser , userCurrentPlan) ;

router.get('/user/gallery/:userId' , authenticateUser , getGallery) ;




export default router;