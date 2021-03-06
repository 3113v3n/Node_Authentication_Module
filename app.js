//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

//LEVEL 3 SECURITY
// const encrypt = require("mongoose-encryption"); //Replaced with md5
//const md5 = require("md5");

//LEVEL 4 SECURITY
// BCRYPT
const bcrypt = require("bcrypt");
const saltRounds = 10;
/**
 * function we use
 * bcrypt.hash(myPlainTextPassword,saltRounds,callback(err,hash){})
 */
const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

const db_name = process.env.DB_NAME;
const url = process.env.HOST_URL;
const secret_key = process.env.SECRET_KEY;

mongoose.connect(`${url}/${db_name}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

//secret key
/**
 * this piece of code is used with mongoose-encryption
 */
// userSchema.plugin(encrypt, {
//   secret: secret_key,
//   encryptedFields: ["password"],
// });

const User = new mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.render("home");
});
app
  .route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post((req, res) => {
    const email = req.body.username;
    const password = md5(req.body.password);
    User.findOne({ email: email }, (err, foundUser) => {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          bcrypt.compare(password, foundUser.password, (err, hashResult) => {
            if (hashResult === true) {
              res.render("secrets");
            }
          });
        }
      }
    });
  });
app
  .route("/register")
  .get((req, res) => {
    res.render("register");
  })

  .post((req, res) => {
    bcrypt.hash(req.body.password, saltRounds, (err, Hash) => {
      const newUser = new User({
        email: req.body.username,
        password: Hash,
      });
      newUser.save((err) => {
        if (err) {
          console.log(err);
        } else {
          res.render("secrets");
        }
      });
    });
  });

app.listen(3000, () => console.log("Server has started successfully"));
