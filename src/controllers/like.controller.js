import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!videoId)
        throw new ApiError(400,"VideoId Required")
    if(!mongoose.Schema.Types.ObjectId.isValidObjectId(videoId))
        throw new ApiError(400,"Invalid VideoId")

    const video = await Video.findById(videoId)
    if(!video)
        throw new ApiError(400,"Video not found")
    
    const like = await Like.findOne({video:videoId,likedBy:req.user?._id})

    if(like)
        await Like.deleteOne({video:videoID,likedBy:req.user?._id})
    else
        await Like.create({video:videoId,likedBy:req.user?._id})

    const hasUserLiked = like?false:true
    const totalLikes = await Like.countDocuments({video:videoId})

    return res.status(200)
    .json(
        new ApiResponse(200,{totalLikes,hasUserLiked},"Video like toggled")
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!commentId)
        throw new ApiError(400,'CommentId required')
    if(!mongoose.Schema.Types.ObjectId.isValidObjectId(commentId))
        throw new ApiError(400,'Invalid CommentId')

    const comment = await Comment.findById(commentId)
    if(!comment)
        throw new ApiError(400,'Comment not found')

    const like = await Like.findOne({comment:commentId,likedBy:req.user?._id})

    if(like)
        await Like.deleteOne({comment:commentId,likedBy:req.user?._id})
    else
        await Like.create({comment:commentId,likedBy:req.user?._id})

    const hasUserLiked = comment?false:true
    const totalLikes = Like.countDocuments({comment:commentId})

    return res.status(200)
    .json(
        new ApiResponse(200,{hasUserLiked,totalLikes},'Commemt Like Toggled')
    )

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!tweetId)
        throw new ApiError(400,'TweetId required')
    if(!mongoose.Schema.Types.ObjectId.isValidObjectId(tweetId))
        throw new ApiError(400,'Invalid TweetId')

    const tweet = await Tweet.findById(tweetId)
    if(!tweet)
        throw new ApiError(400,"Tweet not found")

    const likes = await Like.findOne({tweet:tweetId,likedBy:req.user?._id})

    if(likes)
        await Like.deleteOne({tweet:tweetId,likedBy:req.user?._id})
    else
        await Like.create({tweet:tweetId,likedBy:req.user?._id})

    const hasUserLiked = tweet?false:true
    const totalLikes = await Like.countDocuments({tweet:tweetId})

    return res.status(200)
    .json(
        new ApiResponse(200,{hasUserLiked,totalLikes},'Tweet Likes toggled')
    )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likedVideo = await Like.find({likedBy:req.user._id,video:{$exists:true}}).populate('video')
    return res.status(200)
    .json(
        new ApiResponse(200,{likedVideo},'Liked Videos fetched successfully')
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}