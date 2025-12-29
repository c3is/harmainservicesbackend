const mongoose=require("mongoose");

const priceServiceSchema= new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    price:{
        type:Number,
        required:true
    }
},{ _id: false })

const subServiceSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    price:[priceServiceSchema],
    description:{
        type:String,
    },
    image:{
        type:String,
        required:true
    }
    
}, { _id: false });

const serviceModel=new mongoose.Schema({
    slug:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        index:true
    },
    title:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    heroImg:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    services: [subServiceSchema],

    seoTitle:{
        type:String,
       
    },
    seoDescription:{
        type:String,
        
    },
    keywords:[String]
})


const ServiceModel= mongoose.model("serviceModel",serviceModel)
module.exports=ServiceModel;