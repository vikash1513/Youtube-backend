// require('dotenv').config({path:'./env'})
import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path:'./env'
})

connectDB()














/*
const app=express()
( async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("ERR: ",error);
            throw err
        })
        app.listen(process.env.PORT,()=>{
            console.log("App on ",`${process.env.port}`)
        })
    }
    catch{
    console.log("ERROR: ",error);
    throw err
    }
} )()
*/
