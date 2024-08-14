import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!channelId)
        throw new ApiError(400,'ChannelId required')
    if(!isValidObjectId(channelId))
        throw new ApiError(400,'Invalid channelID')
    const subs = await Subscription.findOne({channel:channelId,subscriber:req.user?._id})
    if(subs)
        await Subscription.deleteOne({channel:channelId,subscriber:req.user?._id})
    else
        await Subscription.create({channel:channelId,subscriber:req.user?._id})
    const isSubscribed = subs?false:true
    const totalSubscribers = await Subscription.countDocuments({chgannel:channelId})
    res
    .status(200)
    .json(new ApiResponse(200,{totalSubscribers,isSubscribed},"Subscription is toggled successfully"))

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channel id")
    }
    const subscribers = await Subscription.find({channel:channelId})

    return res
    .status(200)
    .json(new ApiResponse(200,{subscribers},"Subscribers are fetched successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400,"Invalid subscriberId")
    }
    const user = await Subscriber.findById(subscriberId)
    if(!user){
        throw new ApiError(404,"User not found")
    }
    const subscribedChannels = await Subscription.find({subscriber:subscriberId})
    return res
    .status(200)
    .json(new ApiResponse(200,{subscribedChannels},"Subscribed channels are fetched successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}