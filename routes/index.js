var express = require('express');
var router = express.Router();

var User = require('../models/user');
var Message = require('../models/message');

const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const passport = require('passport');

/* GET home page. */
router.get('/', function(req, res, next) {
  Message.find()
    .sort({createdAt: -1})
    .populate('user')
    .exec(function(err, message_list) {
      if (err) { return next(err); }
      res.render('index', { title: 'Members Only Board', messages: message_list });
    });
});

/* POST for posting a new message. */
router.post('/', [
  body('title', 'Title must not be empty.').trim().isLength({min: 1}).escape(),
  body('msg_text', 'Text must not be empty.').trim().isLength({min: 1}).escape(),

  (req, res, next) => {
    const errors = validationResult(req);

    const new_msg = new Message(
      { title: req.body.title,
        text: req.body.msg_text,
        user: req.user
      });

    if (!errors.isEmpty()) {
      Message.find()
        .sort({createdAt: -1})
        .populate('user')
        .exec(function(err, message_list) {
          if (err) { return next(err); }
          res.render('index', { title: 'Members Only Board', messages: message_list, new_message: new_msg, errors: errors.array() });
        });
    }
    else {
      new_msg.save(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
    }
  }
]);

/* GET log-in page. */
router.get('/log-in', function(req, res) {
  if (res.locals.currentUser) { res.redirect('/'); }
  else {
    res.render('log-in', { title: 'Log In' });
  }
});

/* POST log-in page. */
router.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/"
  })
);

/* GET sign-up page. */
router.get('/sign-up', function(req, res) {
  if (res.locals.currentUser) { res.redirect('/'); }
  else {
    res.render('sign-up', { title: 'Sign Up' });
  }
});

/* POST sign-up page. */
router.post('/sign-up', [

  // Validate and sanitize.
  body('first_name', 'First name required.').trim().isLength({min: 1}).escape(),
  body('last_name', 'Last name required.').trim().isLength({min: 1}).escape(),
  body('username', 'Username required.').trim().isLength({min: 1}).escape(),
  body('password', 'Password required.').isLength({min: 1}).escape(),
  body('confirm_password', 'Confirm password must match password.').isLength({min: 1}).escape().custom((value, {req}) => value===req.body.password),
  body('member_password').escape(),

  // Process after validation and sanitization.
  (req, res, next) => {

    // Extract validation errors.
    const errors = validationResult(req);

    bcrypt.hash(req.body.password, 10, (err, hashedPassword) => {

      if (err) { return next(err); }

      const user = new User({
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        username: req.body.username,
        password: hashedPassword,
        is_member: (req.body.member_password===process.env.MEMBER_PASSWORD || req.body.member_password===process.env.ADMIN_PASSWORD),
        is_admin: req.body.member_password===process.env.ADMIN_PASSWORD,
      });

      if (!errors.isEmpty()) {
        // Errors. Render form again with sanitized values and error messages.
        res.render('sign-up', { title: 'Sign Up', user: user, errors: errors.array()});
        return;
      }
      else {
        // Data from form is valid. Check if username is already taken.
        User.findOne( {'username': req.body.username}, (err, found_username) => {
          if (err) { return next(err); }
          if (found_username) {
            var error = new Error('Username already exists.');
            error.status = 409;
            error.msg = 'That username is already taken.';
            var errors = [error];
            res.render('sign-up', { title: 'Sign Up', user: user, errors: errors });
            return;
          }
          else {
            user.save( function(err) {
              if (err) { return next(err); }
              res.redirect('/');
            });
          }
        });
      }
    });
  }
]);

router.get('/become-member', function(req, res) {
  if (req.user.is_member) { res.redirect('/'); }
  else {
    res.render('become-member', { title: 'Become a Member' });
  }
});

/* POST for guessing member password. */
router.post('/become-member', [
  body('member_password').isLength({min: 1}).escape(),

  (req, res, next) => {
    if (req.body.member_password===process.env.MEMBER_PASSWORD) {
      const user = new User({
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        username: req.user.username,
        password: req.user.password,
        is_member: true,
        is_admin: req.user.is_admin,
        _id: req.user._id,
      });

      User.findByIdAndUpdate(req.user._id, user, {}, function(err, member_user) {
        if (err) { return next(err); }
        // Successful.
        res.redirect('/');
      });
    }
    else {
      res.redirect('/become-member');
    }
  }
]);

router.get("/log-out", (req, res) => {
  req.logout();
  res.redirect("/");
});

router.get('/delete/:id', (req, res, next) => {
  if (!req.user.is_admin) {
    res.redirect('/');
  }
  else {
    Message.findById(req.params.id).populate('user').exec(function(err, message) {
      if (err) { return next(err); }
      if (message == null) {
        res.redirect('/');
      }
      res.render('delete-message', {title: 'Delete Message', message: message});
    });
  }
});

router.post('/delete/:id', (req, res, next) => {
  Message.findById(req.body.messageid).exec(function (err, message) {
    if (err) { return next(err); }
    Message.findByIdAndRemove(req.body.messageid, function deleteMessage(err) {
        if (err) { return next(err); }
        // Success
        res.redirect('/');
    });
  });
});

module.exports = router;
