const mongoose=require("mongoose");

const JobAcceptanceSchema= new mongoose.Schema({
    requestId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"ServiceRequest",
    },
    providerId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"Provider"
    },
    source:{
        type:String,
        required:true,
        enum:["whatsapp","admin","simulation"],
        default:"simulation"
    },


},{
    timestamps:true
})

const JobAcceptance= mongoose.model("JobAcceptance",JobAcceptanceSchema);
module.exports={JobAcceptance};