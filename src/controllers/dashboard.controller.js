import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const channelStats={}

    const videoStats = await Video.aggregate([
        {
            $match:{
                owner:req.user?._id
            }
        },
        {
            $group:{
                _id:null,
                totalViews:{$sum:"$views"},
                totalVideos:{$count:{}}
            }
        }
    ])
    const subscribers = await Subscription.aggregate([
        {
            $match:{
                channel:req.user?._id
            }
        },
        {
            $count:"totalSubscribers"
        }
    ])
    const likes = await Like.aggregate([
        {
            $match:{
                video: { $ne: null },
                liked: true,
           }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"channelVideos",
                pipeline:[
                    {
                        $match:{
                            owner:req.user?._id
                        }
                    },
                    {
                        $project:{
                            _id:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                channelVideo:{
                    $first:"$channelVideo"
                }
            }
        },
        {
            $match:{
                channelVideo:{$ne:null}
            }
        },
        {
            $group:{
                _id:null,
                likesCount:{
                    $sum:1
                }
            }
        }
    ])
    channelStats.ownerName = req.user?.fullName
    channelStats.totalViews = (videoStats && videoStats[0]?.totalViews) || 0
    channelStats.totalVideos = (videoStats && videoStats[0]?.totalVideos) || 0
    channelStats.totalSubscribers = (subscribers && subscribers[0]?.totalSubscribers) || 0
    channelStats.totalLikes = (likes && likes[0]?.likesCount) || 0

    return res.status(200)
    .json(
        new ApiResponse(200,channelStats,"Fetched")
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const video = await Video.aggregate([
        {
            $match:{
                owner : mongoose.Schema.Types.ObjectId(req.user?._id)
            },
        },
        {
            $sort:{
                createdAt:-1
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
                ],
            },
        },
        {
            $lookup:{
                from:"comments",
                localField:"_id",
                foreignField:"video",
                as:"comments"
            },
        },
        {
            $project:{
                title:1,
                thumbnail:1,
                isPublished:1,
                createdAt:1,
                updatedAt:1,
                description:1,
                views:1,
                likesCount:{
                    $size:"$likes"
                },
                dislikesCount:{
                    $size:"$dislikes"
                },
                commentsCount:{
                    $size:"$comments"
                }
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(200,video,"Videos fetched successfully")
    )
})

export {
    getChannelStats, 
    getChannelVideos
    }