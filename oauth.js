//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const _app = express();
const secret_key = process.env.SECRET_KEY;

_app.use(express.static("public"));
_app.set("view engine", "ejs");
_app.use(bodyParser.urlencoded({ extended: true }));

//initialize Session
_app.use(
  session({ secret: secret_key, resave: false, saveUninitialized: false })
);
//initialize Passport
_app.use(passport.initialize());
_app.use(passport.session());

const db_name = process.env.DB_NAME;
const url = process.env.HOST_URL;

mongoose.connect(`${url}/${db_name}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//deprecation error for passport

mongoose.set("useCreateIndex", true);
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  //OAUTH
  googleId: String,
  secret: String,
});
//add plugin
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
//####### Use passport
//sets up local mongoose strategy
passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);
_app.get("/", (req, res) => {
  res.render("home");
});
_app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);
_app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.render("secrets");
  }
);
_app
  .route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post((req, res) => {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });
    req.login(user, (err) => {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
      }
    });
  });
_app.route("/secrets").get((req, res) => {
  User.find({ secret: { $ne: null } }, (err, secrets) => {
    //{$ne:null}} ==> means !=null
    if (err) {
      console.log(err);
    } else {
      if (secrets) {
        res.render("secrets", { usersWithSecrets: secrets });
      }
    }
  });
});
_app
  .route("/submit")
  .get((req, res) => {
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.render("login");
    }
  })
  .post((req, res) => {
    const submitedSecret = req.body.secret;
    //user ID is stored in req thanks to passport
    const userID = req.user.id;
    //find user by ID
    User.findById(userID, (err, myUser) => {
      if (err) {
        console.log(err);
      } else {
        if (myUser) {
          myUser.secret = submitedSecret; //update user secrets details
          myUser.save(() => {
            res.redirect("/secrets");
          });
        }
      }
    });
  });
_app
  .route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    User.register(
      { username: req.body.username },
      req.body.password,
      (err, user) => {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, () => {
            res.redirect("/secrets");
          });
        }
      }
    );
  });
_app.get("/logout", (req, res) => {
  req.logout(); //passport inbuilt function
  res.redirect("/");
});
_app.listen(3000, () => console.log("Server has started successfully"));
