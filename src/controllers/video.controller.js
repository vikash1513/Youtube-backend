import mongoose, {isValidObjectId, mongo} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    if(!userId)
        throw new ApiError(400,"UserId required")
    if(!mongoose.Schema.Types.ObjectId.isValidObjectId(userID))
        throw new ApiError(400,"Invalid UserId")

    const user = await User.findById(userId)

    const video = await Video.Aggregate([
        {
            $match:{
                user:mongoose.Schema.Types.ObjectId(userId)
            },
        },
        {
            $sort:{
                sortType:sortBy
            },
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes",
                pipeline:[
                    {
                        $match:{
                            liked:true
                        },
                    },
                    {
                        $group:{
                            _id:"liked",
                            owners:{$push:"$likedBy"}
                        },
                    },
                ],
            },
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"dislikes",
                pipeline:[
                    {
                        $match:{
                            liked:false
                        },
                    },
                    {
                        $group:{
                            _id:"liked",
                            owners:{$push:"$likedBy"}
                        },
                    },
                ],
            },
        },
        {
            $addFields:{
                likes:{
                    $cond:{
                        if:{
                            $gt:[{$size:"$likes"},0],
                        },
                        then:{
                            $first:"$likes.owners",
                        },
                        else:[]
                    },
                },
                dislikes:{
                    $cond:{
                        if:{
                            $gt:[{$size:"$dislikes"},0],
                        },
                        then:{
                            $first:"$dislikes.owners",
                        },
                        else:[]
                    },
                },
            },
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {
                        $project:{
                            fullName:1,
                            username:1,
                            avatar:1,
                            _id:1
                        },
                    },
                ],
            },
        },
        {
            $unwind:"$owner"
        },
        {
            $project:{
                videoFile:1,
                owner:1,
                isOwner:{
                    $cond:{
                        if:{
                            $eq:[req.user?._id,"$owner._id"]
                        },
                        then:true,
                        else:false
                    },
                },
                likesCount:{
                    $size:"$likes"
                },
                disLikesCount:{
                    $size:"$dislikes"
                },
                isLiked:{
                    $cond:{
                        if:{
                            $in:[req.user?._id,"$likes"]
                        },
                        then:true,
                        else:false
                    },
                },
                isDisliked:{
                    $cond:{
                        if:{
                            $in:[req.user?._id,"dislikes"]
                        },
                        then:true,
                        else:false
                    },
                },
                isLikedByVideoOwner:{
                    $cond:{
                        if:{
                            $in:[video.owner,"$likes"]
                        },
                        then:true,
                        else:false
                    }
                }
            }
        }
    ])

    if(!video)
        throw new ApiError(500,"Error while fetching videos")

    return res.status(200)
    .json(
        new ApiResponse(200,video,"Videos fetched successfully")
    )
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    let videoFileLocalFilePath = null;
    if (req.files && req.files.videoFile && req.files.videoFile.length > 0) {
        videoFileLocalFilePath = req.files.videoFile[0].path;
    }
    if(!(title || description))
        throw new ApiError(400,"Title and description required")
    if (!videoFileLocalFilePath)
        throw new ApiError(400, "Video File Required")

    let thumbnailLocalFilePath = null;
    if (req.files && req.files.thumbnail && req.files.thumbnail.length > 0) {
        thumbnailLocalFilePath = req.files.thumbnail[0].path;
    }
    if (!thumbnailLocalFilePath)
        throw new ApiError(400, "Thumbnail File Must be Required");

    const videoFile = await uploadOnCloudinary(videoLocalPath)
    if(!videoFile.url)
        throw new ApiError(500,"Error while uploading videoFile")

    const thumbnail = await uploadOnCloudinary(thumbnailLocalFilePath)
    if(!thumbnail.url)
        throw new ApiError(500,"Error while uploading thumbnail")

    const video = await Video.create({
        videoFile:videoFile.url,
        title:title,
        description:description,
        owner:req.user?._id,
        thumbnail:thumbnail.url,
        duration:videoFile.duration,
        // views:,
        // isPublished:
    })

    if(!video)
        throw new ApiError(500,"Error while publishing video")

    return res
    .status(200)
    .json(new ApiResponse(200, video, "Video published successfully"));
    // TODO: get video, upload to cloudinary, create video
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    return res.status(200)
    .json(
        new ApiResponse(200,req.video,"Video fetched successfully")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const { title , description } = req.body
    if(!(title || description))
        throw new ApiError(400,"Title and description required")
    let thumbnailLocalFilePath = null
    if(req.files && req.files.thumbnail && req.files.thumbnail.length > 0 )
        thumbnailLocalFilePath = req.files.thumbnail[0].path
    if(!thumbnailLocalFilePath)
        throw new ApiError(400,"Thumbnail required")

    const thumbnailFile = await uploadOnCloudinary(thumbnailLocalFilePath)
    if(!thumbnailFile)
        throw new ApiError(400,"error while uploading thumbnail")

    const videoFile = Video.findByIdAndUpdate(
        req.video?._id,
        {
           title,
           description,
           thumbnail:thumbnailFile 
        },
        {new:true}
    )

    if(!videoFile)
        throw new ApiError(500,"Something went wrong while updating details")

    return res.status(200)
    .json(
        new ApiResponse(200,videoFile , "Video details upadted successfully")
    )

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId)
        throw new ApiError(400,"Invalid videoId")
    if(!mongoose.Schema.Types.ObjectId.isValidObjectId(videoId))
        throw new ApiError(400,"VideoId not found")
    const video = await Video.findByIdAndDelete(videoId)
    if(!video)
        throw new ApiError(500,"Error while deleteing video")
    const deletedlikes = await WakeLockSentinel.deleteMany(
        {video:mongoose.Schema.Types.ObjectId(videoId)}
    )
    return res.status(200)
    .json(
        new ApiResponse(200,{ isDeleted: true },"Video deleted successfully")
    )

    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId)
        throw new ApiError(400,"Required VideoId")
    if(!mongoose.Schema.Types.ObjectId.isValidObjectId(videoId))
        throw new ApiError(400,"Invalid videoId")

    const publishStatus = await Video.findByIdAndUpdate(
        videoId,
        {
            isPublished:!isPublished
        },
        {new:true}
    )
    if(!publishStatus)
        throw new ApiError(500,"Error while toggling publishStatus")
    return res.status(200)
    .json(
        new ApiResponse(200,publishStatus,"Publish Status Changed Successfully")
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}