import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from "jsonwebtoken"

const generateAccessTokenandRefreshTokens = async(userid)=>{
    try{
        const user = await User.findById(userid)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}

    }catch(err){
        throw new ApiError('500',"Something went wrong while generating tokens")
    }
}

const registerUser = asyncHandler( async (req,res)=>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists -> username or email
    // check for images 
    // check for avatar
    // upload them to cloudinary , avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response
    const { fullName,email,username,password } = req.body
    console.log("email",email);

    // if(fullName==="")throw new ApiError(400,"Fullname is required")
    if(
        [fullName,email,username,password].some((field)=>
            field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required")
    }

    const existedUSer = await User.findOne({
        $or:[{ username },{ email }]
    })

    if(existedUSer){
        throw new ApiError(409,"User already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    


    if(!avatar){
        throw new ApiError(400,"Avatar is required")
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser)throw new ApiError(500,"Something went wrong while registering a user")
    
    return res.status(201).json(
        new ApiResponse(200 , createdUser ,"User Registered Successfully")
    )
} ) 

const loginUser = asyncHandler(async (req,res)=>{
    // req->body fetch data
    // username or email
    // find user
    // password check
    // access and refresh token generate
    // send cookie
    // resposne 
    
    const {email,username,password} = req.body
    if(!(username || email)){
        throw new ApiError(400,"Username or email required")
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user)throw new ApiError(404,"User does not exist")
    
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid)throw new ApiError(401,"Enter correct password")
    
    const { accessToken,refreshToken } = await generateAccessTokenandRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly:true,
        secure:true
    }
    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            user:loggedInUser,accessToken,refreshToken
        },"User logged in successfully")
    )
})

const logoutUser = asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(req.user._id,{
        $set:{
            refreshToken:undefined
        }
    },{
        new:true
    })

    const options={
        httpOnly:true,
        secure:true
    }
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))
})

const refreshAccessToken = asyncHandler (async (req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken)throw new ApiError(401,"Unauthorized request")

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        
        const user = await User.findById(decodedToken?._id)
    
        if(!user)throw new ApiError(401,"Invalid refresh token")
    
        if(incomingRefreshToken !== user?.refreshToken)throw new ApiError(401,"Refresh token is expired or used")
    
        const options = {
            httpOnly:true,
            secure:true
        }
        
        const {newAccessToken,newRefreshToken} = await generateAccessTokenandRefreshTokens(user._id)
    
        return res.status(200)
        .cookie("newAccessToken",newAccessToken,options)
        .cookie("newRefreshToken",newRefreshToken,options)
        .json(new ApiResponse(
            200,
            {accessToken,refreshToken},
            "Access Topken refreshed"
        ))
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{

    const { oldPassword,newPassword } = req.body
    // if(!(newPassword===confirmPassword))throw new ApiError(401)
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect) throw new ApiError(400,"Incorrect Password")
    user.password=newPassword
    await user.save({validateBeforeSave:false})
    return res.status(200)
    .json(200,{},"Password reset successfully")

})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(200,req.user,"Current User fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const { fullName,email } = req.body
    if(!(fullName || email)){
        throw new ApiError(401,"All fields are required")
    }
    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName:fullName,
                email:email
            }
        },
        {new:true}
    )
    .select("-password")
    return res.status(200)
    .json(new ApiResponse(200,user,"Accounts details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path 
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing ")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url)
        throw new ApiError(400,"Error while uploading avatar")

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.files?.path
    if(!coverImage)throw new ApiError(400,"Cover Image missing")
    
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url)throw new ApiError(400,"Error while uploading cover image")

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user,"Cover Image updated successfully"))

})


export { registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}
