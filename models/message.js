const { DateTime } = require('luxon');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var MessageSchema = new Schema(
    {
        title: {type: String, required: true},
        text: {type: String, required: true},
        user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    },
    { timestamps: true }
);

// Nicely format the timestamp.
MessageSchema.virtual('timestamp').get(function () {
    return DateTime.fromJSDate(this.createdAt).toLocaleString(DateTime.DATETIME_FULL);
});

// Export module
module.exports = mongoose.model('Message', MessageSchema);