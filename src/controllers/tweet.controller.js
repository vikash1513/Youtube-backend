import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body
    const {userId} = req.user._id
    if(!content)
        throw new ApiError(400,'Content is required')
    if(!userId)
        throw new ApiError(400,'userId required')
    if(!isValidObjectId(userId))
        throw new ApiError(400,'Invalid userId')

    const tweet = await Tweet.create({
        content,
        owner:userId}
    )
    return res.status(200)
    .json(
        new ApiResponse(200,tweet,'Tweet creted successfully')
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const tweet = await Tweet.findById({owner:req.user._id})
    return res.status(200)
    .json(
        new ApiResponse(200,tweet,"Tweet fetched successfully")
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params
    if(!tweetId){
        throw new ApiError(400,"Tweet id is required")
    }
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"Invalid tweet id")
    }
    const {content} = req.body

    const tweet = await Tweet.findByIdAndUpdate(tweetId,
        {
            $set:{
                content
            }
        },
        {
            new:true
        }
    )
    res
    .status(200)
    .json( new ApiResponse(200,tweet,"Tweet updated successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params
    if(!tweetId)
        throw new ApiError(400,'TweetId required')
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"Invalid tweet id")
    }
    await Tweet.findByIdAndDelete(tweetId)
    return res.status(200)
    .json(
        new ApiResponse(200,{isDeleted:true},'Tweet deleted successfully')
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}