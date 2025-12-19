const express = require('express');

const app=express();

// const {adminAuth,userAuth} = require("./middlewares/auth")

const {connectDB}=require("./config/db");

// const UserModel=require("./models/UserModel");
const ServiceModel=require("./models/ServiceModel")

app.use(express.json());    

// app.post("/user",async (req,res)=>{
//     try{
//         const user = new UserModel({
//         firstName:"Kamran",
//         lastName:"Wani",
//         emailId:"kamranwani@gmail.com",
//         password:"kammy",
//         age:29,
//         gender:"male"
//     })

//     await user.save();
//     res.send("user saved");
//     }
//     catch (err){
//         console.log("something went wrong");
//     }
// })

app.post("/service",async(req,res)=>{
    try{
        const service=new ServiceModel(req.body)
        await service.save();
        res.send("user saved");

    }
    catch(err){
        res.status(401).send("something went wrong");
    }
})

app.get("/service",async(req,res)=>
{
    try{
        const services=await ServiceModel.find({});
        res.send(services);

    }catch(err){
        res.send("something went wrong")
    }
})

// app.use("/admin",adminAuth)
// app.get("/user/login",(req,res)=>{
//     console.log("no auth");
//     res.send("logged");
// })
// app.use("/user",userAuth);

// app.get("/admin/getAllData",(req,res)=>{
//     res.send("data sent");
// })


// app.get("/user/getUser",(req,res)=>{
//     res.send("user sent");
// })

// app.use("/",(err,req,res,next)=>{

//     if(err){res.status(500).send("error ocurred");

//     }
// })

// app.get("/user",(req,res)=>{

//     res.send({username:"Kamran",userPassword:"kammy"})
// })


// app.post("/user",(req,res)=>{

//     res.send("Data Received")
// })
// app.use('/b',(req,res)=>{
//     res.send("all route")
// })


// app.use('/btest',(req,res)=>{
//     res.send("test route")
// })

// app.use('/hello',(req,res)=>{
//     res.send("hello route")
// })

connectDB().then(()=>{
    console.log("connection estb");
    app.listen(7777,()=>{
    console.log("server 7777 connected");
})
})
.catch((err)=>{
    console.error("error occurred")
})

