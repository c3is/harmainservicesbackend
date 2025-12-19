const mongoose=require("mongoose");

const  connectDB= async()=>{
    await mongoose.connect("mongodb+srv://kamraanwani_db_user:iA5A4bN1q4aGal7d@practicecluster.u0qxqdz.mongodb.net/ServicesDB");
}


module.exports={
    connectDB
}
