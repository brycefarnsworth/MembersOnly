var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var UserSchema = new Schema(
    {
        first_name: {type: String, required: true, maxLength: 100},
        last_name: {type: String, required: true, maxLength: 100},
        username: {type: String, required: true, maxLength: 100},
        password: {type: String, required: true},
        is_member: {type: Boolean, required: true},
        is_admin: {type: Boolean, required: true},
    }
);

// Virtual for user's full name
UserSchema
.virtual('full_name')
.get(function () {
    return this.first_name + ' ' + this.last_name;
});

// Export module
module.exports = mongoose.model('User', UserSchema);