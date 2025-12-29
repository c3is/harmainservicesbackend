const mongoose=require("mongoose");

const ServiceRequestSchema= new mongoose.Schema({
    serviceId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"serviceModel"

    },
    serviceName:{
        type:String,
        required:true
    },
    customerName:{
        type:String,
        required:true,
    },
    customerPhone:{
        type:String,
        required:true,
    },
    status:{
        type:String,
        required:true,
        enum: ["pending", "assigned","cancelled"],
        default:"pending"
    },

},{ timestamps: true,}
)

const ServiceRequest=mongoose.model("ServiceRequest",ServiceRequestSchema);
module.exports={ServiceRequest}