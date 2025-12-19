const adminAuth=(req,res,next)=>{
    const token ="xyz"
    const isAuth= token == "xyz";
    if(!isAuth){
        res.status(401).send("Unauthorized Access");
    }
    else{
        next()
    }
}

const userAuth=(req,res,next)=>{
console.log("user auth checking");
const token="userkey"
const isUserAuth=token == "userkey";
if(!isUserAuth){
    res.status(401).send("Unauthorized User");
}
else{
    next();
}
}


module.exports={
    adminAuth,userAuth
}