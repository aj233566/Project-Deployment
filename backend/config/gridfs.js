const mongoose = require("mongoose");
let gridfsBucket;
function initializeGridFS() {
    if (!mongoose.connection.db) {
        throw new Error("MongoDB connection is not ready.");
    }
    gridfsBucket = new mongoose.mongo.GridFSBucket(
        mongoose.connection.db,
        {
            bucketName: "incidentEvidence"
        }
    );
    console.log("GridFS initialized");
}
function getGridFSBucket() {
    if (!gridfsBucket) {
        throw new Error("GridFS has not been initialized.");
    }
    return gridfsBucket;
}
module.exports = {
    initializeGridFS,
    getGridFSBucket
};