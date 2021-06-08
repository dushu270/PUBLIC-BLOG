require('dotenv').config();
const express = require("express");
const bodyparser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const path=require('path');
const nodemailer=require('nodemailer');
const md5=require("md5")

const app=express()
let code;
let regA = 0;
let logA = 0;
let authorName;
let aboutAuthor;
let authorUserName;
let newUser
let resetemail;
let email=0
let deluser
let verifyresetpwdemail=0
let verifyregisteremail=0


app.set("view engine", "ejs");

app.use(bodyparser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "/")));


app.use(session({
  secret:"our little secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/miniprojectDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("useCreateIndex", true);


const miniprojectschema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: { type: String, required: true },

  date: String,
  username: { type: String, required: true },
});
const articlesdata = mongoose.model("articlesdata", miniprojectschema);

const UserSchema = new mongoose.Schema({
  email: { type: String },
  username: { type: String},
  firstname: { type: String},
  about: { type: String},

  password: { type: String},
  googleId:{type: String},
});



UserSchema.plugin(passportLocalMongoose);
UserSchema.plugin(findOrCreate);

const User = new mongoose.model("User", UserSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google//",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
          
    User.findOne({email:profile.emails[0].value},function(err,exist_email){
      if(exist_email===null){
        authorName=profile.displayName
          aboutAuthor=""
          authorUserName=profile.displayName
          
        User.findOrCreate({pic:profile.photos[0].value,firstname:profile.displayName,googleId: profile.id ,email:profile.emails[0].value,username:profile.displayName}, function (err, user) {
          regA=1;
          return cb(err, user);
        });
            }else{

              

             User.findOne({email: profile.emails[0].value}, function (err, user) {
              authorName=user.firstname
              aboutAuthor=user.about
              authorUserName=user.username
              user.pic=profile.photos[0].value
              user.googleId=profile.id
              user.save()
              return cb(err, user);
            });
            logA=1
            
      }




    })




    
    
  }
));


app.get("/auth/google",

    passport.authenticate('google', { scope: ["profile",'email'] })
  );
  
  app.get("/auth/google//",
    passport.authenticate('google', { failureRedirect: "/" }),
    function(req, res) {
      // Successful authentication, redirect to homepage.
      res.redirect("/");
    });

app.get("/", function (req, res) {
  if(logA===1 || regA===1){
    verifyregisteremail=0
    verifyresetpwdemail=0
  }
  if(logA===0 || regA===0){
    verifyregisteremail=0
    verifyresetpwdemail=0
  }
  if(email===1 && logA===1){
    res.redirect("/admin")
  }else{
  res.render("index", { active1: regA, active2: logA });
  }


  
});

app.get("/blog.ejs", function (req, res) {
  if(logA===0 || regA===0){
    verifyregisteremail=0
    verifyresetpwdemail=0
  }
  if(email===1&& logA===1){
    res.redirect("/admin")

  }else{

  articlesdata.find({}, function (err, result) {
    if (err) {
      res.render('error')
    }else
    {
      res.render("blog", { dataejs: result, active1: regA, active2: logA });

    }
  });
  }
});

app.get("/profile.ejs", function (req, res) {
  if(email===1&& logA===1){
    res.redirect("/admin")

  }else{
  
   

  articlesdata.find({ username: authorUserName }, function (err, result) {
    if (err) {
      res.render("error")
    }else{
      if (regA) {
        res.render("profile", {
          active1: regA,
          active2: logA,
          authorName: authorName,
          aboutAuthor: aboutAuthor,
          posts: result,
          
        });
      } else if (logA) {
        res.render("profile", {
          active1: regA,
          active2: logA,
          authorName: authorName,
          aboutAuthor: aboutAuthor,
          posts: result,
         

        });
      } else {
        res.render("signin", { errorMsg: "" });
      }
    }
  });
}
});

app.get("/article.ejs/:name", function (req, res) {
 
  articlesdata.findOne({ title: req.params.name }, function (err, found) {
    if (err|| found===null) {
      res.render("error")
    }else{
      res.render("article", {
        postdata: found,
        active1: regA,
        active2: logA,
        logusername: authorUserName,
        email:email
      });
    }
  });

});

app.get("/signin.ejs", function (req, res) {
  if(logA===0 || regA===0){
    verifyregisteremail=0
    verifyresetpwdemail=0
  }
  if(logA===0 && regA===0){

  res.render("signin", { errorMsg: " " });
  }else{
    if(email===1&& logA===1){
      res.redirect("/admin")
    }else{
      res.redirect('/')
    }
  }
});

app.post("/signin.ejs", function (req, res) {
  resetemail=req.body.email
  

  User.findOne(
    { email: req.body.email, password:md5(req.body.password) },
    function (err, found) {
      if (err) {
        res.render("error")

      } else if (found) {
        if(found.email==="publicblog2021@gmail.com"){
          email=1
        }
        authorName = found.firstname;
        aboutAuthor = found.about;
        authorUserName = found.username;
        logA = 1;
        if(email===1&& logA===1){
          res.redirect("/admin")
        }else{
        res.redirect("/");
        }
      } else if (found === null) {
        res.render("signin", { errorMsg: "Invalid details.Try again!" });
      }
    }
  );
});

app.post("/compose.ejs", function (req, res) {
  var options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  var day = new Date();
  var today_date = day.toLocaleDateString("en-US", options);
  let newarticle = new articlesdata({
    title: req.body.titlename,
    content: req.body.content,
    date: String(today_date),
    username: authorUserName,
  });
  newarticle.save(function (err) {
    if (err) {
      res.render("error")
    } else {
      res.redirect("/blog.ejs");
    }
  });
});

app.get("/compose.ejs", function (req, res) {
  if(logA===0 || regA===0){
    verifyregisteremail=0
    verifyresetpwdemail=0
  }
  if(email===1&& logA===1){
    res.redirect("/admin")

  }else{
  if (regA) {
    res.render("compose", { active1: regA, active2: logA });
  } else if (logA) {
    res.render("compose", { active1: regA, active2: logA});
  } else {
    res.render("signin", { errorMsg: " " });
  }
}
});

app.get("/register.ejs", function (req, res) {
  if(logA===0 && regA===0){
  res.render("register",{errorMsg:"",def_email:"",def_username:"",def_firstname:"",def_about:""});
  }else{
    if(email===1&& logA===1){
      res.redirect("/admin")
    }else{
      res.redirect("/")
    }
  }
});

app.post("/register.ejs", function (req, res) {
  
  newUser = new User({
    email: req.body.email,
    username: req.body.username,
    firstname: req.body.firstname,
    about: req.body.about,
    password: md5(req.body.password)
  });
  let emailvalue=req.body.email
  let usernamevalue=req.body.username
  let firstnamevalue=req.body.firstname
  let aboutvalue=req.body.about

  User.findOne({ email: req.body.email }, function (err, present) {
    if (err) {
      res.render("error")

    } else if (present) {
      if (
        present.email === req.body.email &&
        present.username === req.body.username
      ) {
        res.render("register", {
          errorMsg: "User with the email and username already exist.Try again!",def_email:"",def_username:"",def_firstname:firstnamevalue,def_about:aboutvalue
        });
      } else if (present.email === req.body.email) {
        res.render("register", {
          errorMsg: "User with the email already exist.Try again!",def_email:"",def_username:usernamevalue,def_firstname:firstnamevalue,def_about:aboutvalue
        });
      } else if (present.username === req.body.username) {
        res.render("register", {
          errorMsg: "User with the username already exist.Try again!",def_email:emailvalue,def_username:"",def_firstname:firstnamevalue,def_about:aboutvalue
        });
      }
    } else {

      if (req.body.password === req.body.confirmpassword) {
              
        if(req.body.password.length<=5){
          res.render("register", {
            errorMsg: "password length should minimum of 6 characters.",def_email:emailvalue,def_username:usernamevalue,def_firstname:firstnamevalue,def_about:aboutvalue
          });

        }else{
        code=Math.floor((Math.random()*1000000)+1);
        verifyregisteremail=1

        const output = `
          <h3>Email verifiaction</h3>
          <ul>  
            
            <li>Email: ${req.body.email}</li>
            <li>code: ${code}</li>
          </ul>
          <h3>This is the verfication code for your account registration</h3>
        `;
        let transporter = nodemailer.createTransport({
         
          service : 'gmail',
          auth: {
              user: 'publicblog2021@gmail.com',
              pass: 'publicblog123!@#'  
          },
          tls:{
            rejectUnauthorized:false
          }
        });
      
        let mailOptions = {
            from: '"PUBLIC BLOG" <publicblog2021@gmail.com>', 
            to: req.body.email, 
            subject: 'PUBLIC BLOG account verification', 
            html: output 
        };
      
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
                res.render("error")

            }
            console.log('Message sent: %s', info.messageId);   
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            res.redirect("/verify")
      
        });
  
      }
        
           
          }else{
            res.render("register", {
              errorMsg: "passwords does not match.Try again!",def_email:emailvalue,def_username:usernamevalue,def_firstname:firstnamevalue,def_about:aboutvalue
            });
          }
          } 
    })
  });
app.get("/verify",function(req,res){
  if(email===1&& logA===1){
    res.redirect("/admin")

  }else{
if(verifyregisteremail===1){
  res.render("verify",{msg:"",active1:logA,active2:regA})
}else if(verifyregisteremail===0 && (logA===1 || regA===1)){
  res.redirect("/")
}else{
  res.redirect("/signin.ejs")
}
}

})

app.post("/verify",function(req,res){

  if(parseInt(req.body.verifycode)===code){
    newUser.save(function (err) {
      if (err) {
        console.log(err);
      } else {
        authorName = newUser.firstname;
        aboutAuthor = newUser.about;
        authorUserName = newUser.username;
        authorEmail=newUser.email
        regA = 1;
        res.redirect("/");

      }
    });
  }
  else{
    res.render("verify",{msg:"Invalid code.Try again!",active1:logA,active2:regA})
  }

})




  

        app.get("/verifyresetpwd",function(req,res){
          if(email===1 && logA===1){
            res.redirect("/admin")
        
          }else{

          if(verifyresetpwdemail===1){


          res.render("verifyresetpwd",{msg:"",active1:logA,active2:regA})

          code=Math.floor((Math.random()*1000000)+1);
          const output = `
                  <h3>Email verifiaction</h3>
                  <ul>  
                    
                    <li>Email: ${resetemail}</li>
                    <li>code: ${code}</li>
                  </ul>
                  <h3>This is the verfication code for your account registration</h3>
                `;
                let transporter = nodemailer.createTransport({
                 
                  service : 'gmail',
                  auth: {
                      user: 'publicblog2021@gmail.com',
                      pass: 'publicblog123!@#'  
                  },
                  tls:{
                    rejectUnauthorized:false
                  }
                });
              
                let mailOptions = {
                    from: '"PUBLIC BLOG" <publicblog2021@gmail.com>', 
                    to: resetemail, 
                    subject: 'PUBLIC BLOG account verification', 
                    html: output 
                };
              
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        return console.log(error);
                        res.render("error")

                    }
                    console.log('Message sent: %s', info.messageId);   
                    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
              
                });
              }else if(verifyresetpwdemail===0 && (logA===1 || regA===1)){
                res.redirect("/")
              }else{
                res.redirect("/signin.ejs")
              }
              
            }
        })
        
        app.post("/verifyresetpwd",function(req,res){

          
          if(parseInt(req.body.resetverifycode)===code){
 
            res.redirect("/resetpwd")
            
        
              }
          
          else{

            res.render("verifyresetpwd",{msg:"Invalid code.Try again!",active1:logA,active2:regA})
          }
        })

app.get("/resetpwd",function(req,res){
  if(email===1 && logA===1){
    res.redirect("/admin")

  }else{
  if(verifyresetpwdemail===1){

  res.render("resetpwd",{msg:"",active1:logA,active2:regA})
}else if(verifyresetpwdemail===0 && (logA===1 || regA===1)){
  res.redirect("/")
}else{
  res.redirect("/signin.ejs")
}

  }
})
app.post("/resetpwd",function(req,res){

  if(req.body.newpwd===req.body.confirmnewpwd){
    if(req.body.newpwd.length<=5){

      res.render("resetpwd",{msg:"Minimum password length is 6 characters.",active1:logA,active2:regA})
 
    }else{

    User.findOne({email:resetemail},function(err,reset){
      if(err){
        res.render("error")


      }else
      {
      reset.password=md5(req.body.newpwd)
      reset.save()
      res.redirect("/")
      }
    })
  }
  }else{
    res.render("resetpwd",{msg:"Passwords did not match.Try again!",active1:logA,active2:regA})
  }
})


app.get('/email',function(req,res){
  if(email===1 && logA===1){
    res.redirect("/admin")

  }else if(logA===0 && regA===0){

  res.render("email",{msg:"",active1:logA,active2:regA})
  }else{
    res.redirect("/")
  }

})
app.post("/email",function(req,res){

  resetemail=req.body.resetemail
  User.findOne({email:req.body.resetemail},function(err,data){
   if(err){
     console.log(err)
   }else{
     if(data!==null){
  verifyresetpwdemail=1
  res.redirect("/verifyresetpwd")
     }else{
      res.render("email",{msg:"User does not have a account with this email.",active1:logA,active2:regA})
    }
   }
})

})




app.get("/logout.ejs", function (req, res) {
  if(logA || regA){

  regA = 0;
  logA = 0;
  email=0
  verifyresetpwdemail=0
verifyregisteremail=0
  res.redirect("/");
}else{
  res.redirect("/signin.ejs")
}
});

app.get("/author.ejs/:authorusername", function (req, res) {
  if(email===1&& logA===1){
    res.redirect("/admin")

  }else{
  
    
  
  articlesdata.find(
    { username: req.params.authorusername },
    function (err, result) {
      if (err) {
        res.render("error")

        console.log(err);
      } else {
        User.findOne(
          { username: req.params.authorusername },
          function (err, ide) {
            if (err || ide===null) {
              console.log(err);
              res.render("error")

            } else {
              if (regA) {
                res.render("author", {
                  active1: regA,
                  active2: logA,
                  authorName: ide,
                  aboutAuthor: ide,
                  posts: result,
                  name:authorUserName,
                 
                  email:email
                });
              } else if (logA) {
                res.render("author", {
                  active1: regA,
                  active2: logA,
                  authorName: ide,
                  aboutAuthor: ide,
                  posts: result,
                  name:authorUserName,
                  
                  email:email
                });
              } else {
                res.render("signin", { errorMsg: "" });
              }
            }
          }
        );
      }
    }
  );
  }
});

app.get("/delete/:delete_id", function (req, res) {
  
  if(logA || regA){

  articlesdata.findOne(
    { _id: req.params.delete_id },
    function (err, success_delete) {
      if (err || success_delete===null) {
        res.render("error")

      } else {
        if(success_delete.username===authorUserName || email===1){
        res.render("delete", {
          deldata: success_delete,
          active1: logA,
          active2: regA,
          email:email
        });
      }else{
        res.render("error")
      }
      
      
      }
    }
  );
}else{
  res.redirect("/signin.ejs")
}

});

app.get("/delete.ejs/:iddel", function (req, res) {
  

  if(logA || regA){
    articlesdata.findOne({_id:req.params.iddel},function(err,foun){
      if(err || foun===null){
        res.render('error')
      }else{
      if(foun.username===authorUserName || email===1){
  articlesdata.deleteOne({ _id: req.params.iddel }, function (err, delted) {
    if (err) {
      res.render("error")

    } else {
      if(email!==1){
      res.redirect("/profile.ejs");
    }else{
      res.redirect("/admin")
    }
    }
  });
}else{
  res.render("error")
}
}

})

  }

else{
  res.redirect("/signin.ejs")
}

});

app.get("/update.ejs/:id", function (req, res) {
  if(email===1&& logA===1){
    res.redirect("/admin")

  }else{
  if(logA || regA){

  articlesdata.findOne({ _id: req.params.id }, function (err, update_data) {
    if (err) {
      res.render("error")

    } else {
      if(update_data.username===authorUserName){
      res.render("update", {
        active1: regA,
        active2: logA,
        post_data: update_data,
      });
    }else{
      res.render('error')
    }
    }
  });
}else{
  res.redirect("/signin.ejs")
}
  }
});

app.post("/update.ejs/:id", function (req, res) {
  articlesdata.findById(req.params.id, function (err, doc) {
    if (err || doc===null) {
      res.render("error")

    } else {
      if(doc.username===authorUserName){
      doc.title = req.body.titlename;
      doc.content = req.body.content;
      doc.save(function (err, success) {
        if (err) {
          console.log(err);
          res.render("error")

        } else {
          res.render("article", {
            postdata: doc,
            active1: regA,
            active2: logA,
            logusername: authorUserName,
            email:email
          });
        }
      });
    }else{
      res.render("error")
    }
    }
  });
});



app.get("/editprofile.ejs",function(req,res){
  if(email===1&& logA===1){
    res.redirect("/admin")

  }else{
  if(logA || regA){
  User.findOne({username:authorUserName},function(err,editprofdata){
    if(err){
      res.render("error")

    }else{
      res.render("editprofile", {
        active1: regA,
        active2: logA,
        post_data: editprofdata,
      });
      
    }
  })
}else{
  res.redirect("/signin.ejs")
}
  }
})


app.post("/editprofile.ejs",function(req,res){
  User.findOne({username:authorUserName}, function (err, doc) {
    if (err) {
      res.render("error")

    } else {
      doc.firstname = req.body.fname;
      doc.about = req.body.about;
      doc.save(function (err, success) {
        if (err) {
          console.log(err);
          res.render("error")

        } else {
          authorName=doc.firstname
          aboutAuthor=doc.about
          res.redirect("/profile.ejs")
        }
      });
    }
  });

})




app.get("/search",function(req,res){
  if(email===1&& logA===1){
    res.redirect("/admin")

  }else{
  
  res.render("search", { dataejs: [], active1: regA, active2: logA });
  }

})


app.post("/search",function(req,res){
  if(req.body.search!==""){
  
  articlesdata.find({$or:[{title:{'$regex':String(req.body.search),$options:"i"}},{content:{'$regex':String(req.body.search),$options:"i"}}]},function(err,data){  
    if(err){  
    console.log(err);  
    res.render("error")

    }else{  
                  
      res.render("search", { dataejs: data, active1: regA, active2: logA });

    }  
    })  
  }else if(req.body.search===""){

    res.redirect("/search")

  }

})


app.get("/admin",function(req,res){
  if(email===1&& logA===1){

    User.find({email:{$ne:"publicblog2021@gmail.com"}},function(err,data){
      if(err){
        res.render("error")

      }else{
      res.render("admin",{users:data})
      }


    })
  }else if((logA===1 || regA==1) && email===0){
    res.redirect("/")
  }else{
    res.redirect("/signin.ejs")

  }
})

app.get("/view/:name",function(req,res){
  if(email===1){
    if(logA){

      User.findOne({username:req.params.name},function(err,got){
        if(err || got===null){
          res.render("error")
        }else
        {
        deluser=got.username
        }
    
      
      articlesdata.find({username:req.params.name},function(err,found){
        if(err || found===null || got===null ){
          res.render("error")

        }else{
        res.render("adminview",{posts:found,user:deluser})
        }
      })
    })
    }else{
      res.redirect("/signin.ejs")
    }
  }else{
    res.redirect("/signin.ejs")

  }
})


app.get("/deleteaccount/:deleteuser",function(req,res){
  if(email===1){
    if(logA){

      User.findOne(
        { username: req.params.deleteuser },
        function (err, success_delete) {
          if (err || success_delete===null) {
            res.render("error")

          } else {
            res.render("deleteaccount", {
              deldata: success_delete,
              active1: logA,
              active2: regA,
            });
          
          
          }
        }
      );
    }else{
      res.redirect("/signin.ejs")
    }
  }else{
    res.redirect("/")

  }
});

  
 


app.get("/deleteacc/:deleteuser", function (req, res) {
  if(email===1){
    if(logA){
      User.deleteOne({username:req.params.deleteuser},function(err,f){
        if(err || f.deletedCount===0 || f.n===0){
          console.log("dfwfrre")
          res.render("error")

        }
      articlesdata.deleteMany({username:req.params.deleteuser},function(err,delart){
        if(err || delart.n===0 && f.n===0 ){
          console.log(err)
          res.render("error")

        }else{
          res.redirect("/admin")
        }
      })
    })

    }else{
      res.redirect("/signin.ejs")
    }
  }else{
  
    res.redirect("/")

  }

})


app.use((req, res, next) => {
  res.status(404).render("error")
 })

app.listen(3000, function (req, res) {
  console.log("SERVER STARTED");
});




