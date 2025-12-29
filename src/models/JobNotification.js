const mongoose= require("mongoose");

const JobNotificationRequest=mongoose.Schema({
    serviceRequestId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"ServiceRequest",
    },
    providerId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"Provider",
    },
    status:{
        type:String,
        enum:["sent"],
        default:"sent"
    },
    source:{
        type:String,
        enum:["whatsapp","simulation","admin"],
        default:"simulation"
    }
},{timestamps:true});

const JobNotification=mongoose.model("JobNotificationRequest",JobNotificationRequest);
module.exports={JobNotification};