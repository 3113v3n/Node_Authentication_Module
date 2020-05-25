//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const new_app = express();
const secret_key = process.env.SECRET_KEY;

//initialize Session
new_app.use(
  session({ secret: secret_key, resave: false, saveUninitialized: false })
);
//initialize Passport
new_app.use(passport.initialize());
new_app.use(passport.session());

new_app.use(express.static("public"));
new_app.set("view engine", "ejs");
new_app.use(bodyParser.urlencoded({ extended: true }));

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
});
//add plugin
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
//####### Use passport
//sets up local mongoose strategy
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

new_app.get("/", (req, res) => {
  res.render("home");
});
new_app
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
new_app.route("/secrets").get((req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.render("login");
  }
});
new_app
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
new_app.get("/logout", (req, res) => {
  req.logout(); //passport inbuilt function
  res.redirect("/");
});
new_app.listen(3000, () => console.log("Server has started successfully"));
