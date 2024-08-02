import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js"
import mongoose, { isValidObjectId } from "mongoose";

const getVideoComments = asyncHandler(async(req,res)=>{
    const videoId = req.params
    const {page = 1, limit = 10} = req.query
    
    if(!isValidObjectId(videoId)) return new ApiError(401,"Invalid VideoId")
    
    const video = await Video.findById(videoId)

    const allComments = await Comment.aggregate(
        [
            {
                $match:{
                    video : new mongoose.Schema.Types.ObjectId(videoId)
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
                    foreignField:"comment",
                    as:"likes",
                    pipeline:[{
                        $match:{
                            liked:true
                        },
                        },
                        {
                            $group:{
                                _id:"liked",
                                owners:{$push:"$likedBy"},
                            },
                        },
                    ],
                },
            },
            {
                $lookup:{
                    from:"likes",
                    localField:"_id",
                    foreignField:"comment",
                    as:"dislikes",
                    pipeline:[
                        {
                            $match:{
                                liked:false
                            },
                        },
                        {
                            $group:{
                                _id:liked,
                                owners:{$push:"$likedBy"},
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
                                $first:"$likes.owners"
                            },
                            else:[]
                        }
                    },
                    dislikes:{
                        $cond:{
                            if:{
                                $gt:[{$size:"$dislikes"},0],
                            },
                            then:{
                                $first:"$dislikes.owners"
                            },
                            else:[]
                        },
                    },
                },
            },
            {
                $lookup: {
                  from: "users",
                  localField: "owner",
                  foreignField: "_id",
                  as: "owner",
                  pipeline: [
                    {
                      $project: {
                        fullName: 1,
                        username: 1,
                        avatar: 1,
                        _id: 1,
                      },
                    },
                  ],
                },
              },
              { $unwind: "$owner" },
              {
                $project: {
                  content: 1,
                  owner: 1,
                  createdAt: 1,
                  updatedAt: 1,
                  isOwner: {
                    $cond: {
                      if: { $eq: [req.user?._id, "$owner._id"] },
                      then: true,
                      else: false,
                    },
                  },
                  likesCount: {
                    $size: "$likes",
                  },
                  disLikesCount: {
                    $size: "$dislikes",
                  },
                  isLiked: {
                    $cond: {
                      if: {
                        $in: [req.user?._id, "$likes"],
                      },
                      then: true,
                      else: false,
                    },
                  },
                  isDisLiked: {
                    $cond: {
                      if: {
                        $in: [req.user?._id, "$dislikes"],
                      },
                      then: true,
                      else: false,
                    },
                  },
                  isLikedByVideoOwner: {
                    $cond: {
                      if: {
                        $in: [video.owner, "$likes"],
                      },
                      then: true,
                      else: false,
                    },
                  },
                },
              },
            ])
    
    return res.status(200)
    .json(new ApiResponse(200,allComments,"Comments fetched successfully"))

})

const addComment = asyncHandler(async(req,res)=>{
    const { content } = req.body
    if(!content)throw new ApiError(401,"Comment field is required")
    const { videoId } = req.params
    if(!isValidObjectId(videoId))throw new ApiError(401,"Invalid VideoId")
    
    const comment = await Comment.create({
        content,
        videoId:videoId,
        owner:req.user?._id
    })
    
    if(!comment)throw new ApiError(500,"Error while uploading comment")

    const { username, avatar, fullName, _id } = req.user;
    
    const commentData = {
        ...comment._doc,
        owner:{username,avatar,fullName,_id},
        likesCount:0,
        isOwner:true
    }

    return res.status(200)
    .json(new ApiResponse(200,commentData,"Comment uploaded successfully"))

})

const updateComment = asyncHandler(async(req,res)=>{

    const { content } = req.body
    const { commentId } = req.params
    if(!content)throw new ApiError(400,"Comment must be provided ")
    if(!commentId)throw new ApiError(400,"CommentId required")
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment Id");
    }
    const updatedComment = await Comment.findByIdandUpdate(
        commentId,
        {
            comment:content
        },
        {new:true}
    )

    if(!updatedComment)throw new ApiError(500,"Error while updating comment")
    return res.status(200)
    .json(new ApiResponse(200,updatedComment,"Comment updated successfully"))

})

const deleteComment = asyncHandler(async(req,res)=>{

    const { commentId } = req.params
    if(!commentId)throw new  ApiError(400,"Comment id required")
    if(!mongoose.Schema.Types.ObjectId.isValid(commentId))throw new ApiError(400,"Invalid comment id")

    const comment = await Comment.findByIdandDelete(commentId)
    if(!comment)throw new ApiError(500,"error while deleting comment")

    const deleteLikes = await Like.deleteMany(
        {comment:mongoose.Schema.Types.ObjectId(commentId)}
    )
    return res
    .status(200)
    .json(
        new ApiResponse(200, { isDeleted: true }, "Comment deleted successfully")
    );
    
})


export {
    getVideoComments,
    addComment,
    deleteComment,
    updateComment
}