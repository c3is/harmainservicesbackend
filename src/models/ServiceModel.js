    const mongoose=require("mongoose");

    const detailedSubService= new mongoose.Schema({
        name:{
            type:String,
            required:true
        },
        price:{
            type:Number,
        },
        priceInfo:{
            type:String
        },
        note:{
            type:String
        },
        website:{
            type:String
        },
        image:{
            type:String
        }
    },{ _id: false })

    const subServiceSchema=new mongoose.Schema({
        name:{
            type:String,
            required:true
        },
        info:{
            type:String,
        },
        detailedSubService:[detailedSubService],
        description:{
            type:String,
        },
        image:{
            type:String,
            required:true
        },
        isBookNow:{
            type:Boolean,
            default:true
        }, 
        note:{
            type:String
        },
        details:{
            type:String
        }
        
    }, { _id: false });

    const serviceModel=new mongoose.Schema({
        details:{
            type:String
        },
        slug:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            index:true
        },
        visitingCharges:{
            type:Number,
        },
        note:{
            type:String
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
        Icon:{
            type:String,
        },
        keywords:[String]
    })


    const ServiceModel= mongoose.model("serviceModel",serviceModel)
    module.exports=ServiceModel;