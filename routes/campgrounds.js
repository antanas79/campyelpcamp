var express = require("express");
var router  = express.Router();
var Campground = require("../models/campground");
var Comment = require("../models/comment");
var middleware = require("../middleware");
var geocoder = require("geocoder");

//define escapeRegex function for search use
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

//MULTER CONFIGURATION

var multer = require("multer");
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require("cloudinary");
cloudinary.config({ 
  cloud_name: "antanas79", 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


//INDEX - show all campgrounds
router.get("/", function(req, res){
    var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    var noMatch = null;
    if(req.query.search){
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        // Get all campgrounds from DB
        Campground.find({name: regex}, function(err, allCampgrounds){
       if(err){
           console.log(err);
       } else {
           if(allCampgrounds.length < 1){
               req.flash("error", "No campgrounds match this query, please try again.");
               res.redirect("back");
           } else {
               res.render("campgrounds/index",{campgrounds:allCampgrounds, page: "campgrounds"});
           }
          
       }
    });
        
    } else {
        // Get all campgrounds from DB
        Campground.find({}, function(err, allCampgrounds){
       if(err){
           console.log(err);
       } else {
          res.render("campgrounds/index",{campgrounds:allCampgrounds, page: "campgrounds"});
       }
    });
    }
  
});


// CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single("image"), function(req, res) {
    var name = req.body.name;
    var cost = req.body.cost;
    var desc = req.body.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    };
        geocoder.geocode(req.body.location, function (err, data) {
        if (err || data.status === "ZERO_RESULTS" || typeof data.results[0]==="undefined") {
            req.flash("error", "Invalid address");
        return res.redirect("back");
        }
        var lat = data.results[0].geometry.location.lat;
        var lng = data.results[0].geometry.location.lng;
        var location = data.results[0].formatted_address;
        
        
        // Create a new campground and save to DB
        cloudinary.uploader.upload(req.file.path, function(result) {
          // add cloudinary url for the image to the campground object under image property
          req.body.image = result.secure_url;
          // add author to campground
        //   req.body.campground.author = {
        //     id: req.user._id,
        //     username: req.user.username
        //   }
        var newCampground = {name: name, description: desc, cost: cost, author:author, image: req.body.image, location: location, lat: lat, lng: lng};
          Campground.create(newCampground, function(err, campground) {
            if (err || !campground) {
              req.flash("error", err.message);
              return res.redirect("back");
            }
            res.redirect("/campgrounds");
          });
        });
    });
});

//NEW - show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
   res.render("campgrounds/new"); 
});

// SHOW - shows more info about one campground
router.get("/:id", function(req, res){
    //find the campground with provided ID
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
        if(err || !foundCampground){
            console.log(err);
            req.flash("error", "Campground not found");
            res.redirect("back");
        } else {
            console.log(foundCampground)
            //render show template with that campground
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});

// EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
    Campground.findById(req.params.id, function(err, foundCampground){
        res.render("campgrounds/edit", {campground: foundCampground});
    });
});


router.put("/:id", middleware.checkCampgroundOwnership, upload.single("image"), function(req, res){
  geocoder.geocode(req.body.location, function (err, data) {
    if (err || data.status === "ZERO_RESULTS"|| typeof data.results[0]==="undefined") {
            req.flash("error", "Invalid address");
        return res.redirect("back");
        }
    var lat = data.results[0].geometry.location.lat;
    var lng = data.results[0].geometry.location.lng;
    var location = data.results[0].formatted_address;
    
     cloudinary.uploader.upload(req.file.path, function(result) {
          // add cloudinary url for the image to the campground object under image property
          req.body.image = result.secure_url;
        
    var newData = {name: req.body.name, image: req.body.image, description: req.body.description, cost: req.body.cost, location: location, lat: lat, lng: lng};
    Campground.findByIdAndUpdate(req.params.id, {$set: newData}, function(err, campground){
        if(err || !campground){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            req.flash("success","Successfully Updated!");
            res.redirect("/campgrounds/" + campground._id);
        }
        });
     });
  });
});

// DESTROY CAMPGROUND ROUTE
router.delete("/:id",middleware.checkCampgroundOwnership, function(req, res){
   Campground.findByIdAndRemove(req.params.id, function(err){
      if(err){
          res.redirect("/campgrounds");
      } else {
          res.redirect("/campgrounds");
      }
   });
});



module.exports = router;

