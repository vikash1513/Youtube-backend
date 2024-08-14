import mongoose, {isValidObjectId, mongo} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    if(!(name || description))
        throw new ApiError(400,'Name and description required')
    
    const playlist = await Playlist.create(
        {
            name,
            description,
            owner:req.user?._id
        }
    )
    if(!playlist)
        throw new ApiError(500,'Something went wrong while creating playlist')
    return res.status(200)
    .json(
        new ApiResponse(200,playlist,'Playlist created successfully')
    )

    //TODO: create playlist
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!userId)
        throw new ApiError(400,'userId required')
    if(!isValidObjectId(userId))
        throw new ApiError(400,'Invalid USerid')

    const playlists = await Playlist.find({owner:userId})
    if(!playlists)
        throw new ApiError(500,'Something went wrong while fetching playlist')

    return res.status(200)
    .json(
        new ApiResponse(200,playlists,'Playlists fetched succesfully')
    )
    
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!playlistId)
        throw new ApiError(400,'playlistId required')
    if(!isValidObjectId(playlistId))
        throw new ApiError(400,'Invalid playlistId')

    const playlist = await Playlist.findById(playlistId)
    if(!playlist)
        throw new ApiError(500,'Something went wrong while fetching playlist')
    return res.status(200)
    .json(
        new ApiResponse(200,playlist,'Playlist fetched successfully')
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!(playlistId || videoId))
        throw new ApiError(400,'PlaylistId and VideoId required')
    if(!isValidObjectId(playlistId))
        throw new ApiError(400,'Invalid playlistId')
    if(!isValidObjectId(videoId))
        throw new ApiError(400,'Invalid videoId')

    const video = await uploadOnCloudinary(videoId)
    if(!video.url)
        throw new ApiError(400,'Error while uploading video')

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $push:{
                videos:video
            }
        },
        {new:true}
    )
    if(!playlist)
        throw new ApiError(500,'Error while publishing video')
    return res.status(200)
    .json(
        new ApiResponse(200,{playlist},'Video added successfully')
    )

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    if(!(playlistId || videoId))
        throw new ApiError(400,'PlaylistId and videoId required')
    if(!isValidObjectId(playlistId))
        throw new ApiError(400,'Invalid playlistId')
    if(!isValidObjectId(videoId))
        throw new ApiError(400,'Invalid videoId')
    const playlist = await Playlist.findByIdAndDelete(
        playlistId,
        {
            $pull:{
                videos:videoId
            }
        },
        {new:true}
    )
    if(!playlist)
        throw new ApiError(500,'Error while deleting video')
    return res.status(200)
    .json(
        new ApiResponse(200,{playlist},'Video deleted successfully')
    )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if(!playlistId)
        throw new ApiError(400,'playlistId requires')
    const playlist = await Playlist.findByIdAndDelete(playlistId)
    if(!playlist)
        throw new ApiError(500,'Error while deleting playlist')
    return res.status(200)
    .json(
        new ApiResponse(200,{isDeleted:true},'Playlist deleted successfully')
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    if(!playlistId)
        throw new ApiError(400,'playlistId required')
    if(!isValidObjectId(playlistId))
        throw new ApiError(400,'Invalid playlistId')

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set:{name,
            description}
        },
        {
            new:true
        }
    )
    if(!playlist)
        throw new ApiError(500,'Error while updating details')
    return res.status(200)
    .json(
        new ApiResponse(200,{playlist},'Playlistupdated successfully')
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}