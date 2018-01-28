var express = require("express");
var router  = express.Router();
var passport = require("passport");
var User = require("../models/user");
var Campground = require("../models/campground");

// USER PROFILE
router.get("/:id", function(req, res) {
  User.findById(req.params.id, function(err, foundUser) {
    if(err || !foundUser) {
      req.flash("error", "Something went wrong.");
      return res.redirect("/");
    }
    Campground.find().where('author.id').equals(foundUser._id).exec(function(err, campgrounds) {
      if(err) {
        req.flash("error", "Something went wrong.");
        return res.redirect("/");
      }
      res.render("users/show", {user: foundUser, campgrounds: campgrounds});
    })
  });
});


//EDIT ROUTE
router.get("/:id/edit", function(req, res) {
     User.findById(req.params.id, function(err, foundUser)
     { if(err || !foundUser)
        {
            req.flash("error", "Something went wrong");
          res.redirect("back");
        } else {
        res.render("users/edit", {user: foundUser});
        }
     });
});

//Update ROUTE
router.put("/:id", function(req, res){
     var newData = {firstName: req.body.firstName, lastName: req.body.lastName, email: req.body.email, avatar: req.body.avatar, bio: req.body.bio};
    User.findByIdAndUpdate(req.params.id, {$set: newData}, function(err, user){
     if(err || !user){
         req.flash("error", "Something went wrong");
         res.redirect("back");
     } else{
         req.flash("success","Profile Updated!");
         res.redirect("/users/" + user._id);
     }
  });
});

// DESTROY USER ROUTE
router.delete("/:id", function(req, res){
   User.findByIdAndRemove(req.params.id, function(err){
      if(err){
          req.flash("error", "Something went wrong");
          res.redirect("/campgrounds");
      } else {
          res.redirect("/campgrounds");
      }
   });
});

module.exports = router;