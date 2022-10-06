const express = require('express');
const ejs = require('ejs');
const path = require('path');
const fs = require("fs");
const passport = require('passport');
const session = require('express-session');
//const SQLiteStore = require('connect-sqlite3')(session);
//this could be used for storing session in sqlite
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const mysql = require('mysql2');
const MYSQLStore = require('express-mysql-session')(session);


//this is just for the sake of logging
const timeForLog = require('./timeForLog.js');





//Import Configuration data from the JSON file
const loginConfig = fs.readFileSync('./loginconfig.json', {encoding: "utf-8"});
const loginConfiguration = JSON.parse(loginConfig);
process.env.loginConfiguration = loginConfig;



//since we require the variable saved to process.env to be available in the router
//we reuqire it here, not before the variable is defined
const userRouter = require("./users.js");



const connection = mysql.createPool(loginConfiguration.MYSQLConnection);


//building the main app
const app = new express();


//setting the view engine.
//this could be onnitted if one wishes to dismiss ejs as a view engine. 
app.set("view-engine", "ejs");
//and this sets the directory for ejs templates
//this could be also dismissed if one is to dismiss ejs
app.set('views', path.join(__dirname, 'views'));







//Setting up the folder for public files which are mostly static including css files, images, etc.
app.use(express.static('statics'));


app.use(cookieParser());


//setting the app to use the users router for the paths /users
app.use("/users", userRouter);






//this is to set the server to use sessions.
// A useful tip on this: placing this session setup and setting passport to use it on this app,
// lets one to benefit form the authentications done in the users router. For example: Now, it is possible to 
// use req.isAuthenticated() in this module as well as the users router which comes really handy.
app.use(session({
    secret: loginConfiguration.sessionKey,
    resave: false,
    saveUninitialized: false,
    store: new MYSQLStore({}, connection.promise())
  }));
app.use(passport.authenticate('session'));






//the login page
app.get("/login", (req,res)=>{
    
    
    const validMessagesLogin= [
        "USER_NOT_FOUND",
        "USER_NOT_ACTIVATED",
        "PASSWORD_INCORRECT",
        "ALREADY_ACTIVATED",
        "SUCCESSFUL_REGISTER"
    ];
    //this is for the sake of preventing clients of making irrelevant requests with irrelevant query params
    
    if (req.isAuthenticated()){
        
        
        res.redirect('/dashboard');
    } else {
        
        
            if (validMessagesLogin.indexOf(req.query.failMessage)+1){
                
                res.render('login.ejs', {err: req.query.failMessage});
            } else {
                res.render('login.ejs');
                
            }
        
            
    }

    
});


app.get('/', (req, res)=>{
    
    
    if (req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    };
});

//the dashboard page
app.get("/dashboard", (req, res)=>{
    
    if(req.isAuthenticated()){

        
        
        if (req.user.isAdmin) {
            jwt.verify(req.cookies.authToken, loginConfiguration.admin_access.keyForToken, (error, decoded)=>{
                if(error){
                    res.redirect('/');
                    //////////////must be handled maybe to logut and clear cookies
                }else{
                    if(decoded.isAdmin){
                        res.render('admindashboard.ejs',{username: req.user.username});
                    }
                }
                
            });
            
        } else {
            res.render('dashboard.ejs', {username: req.user.username, id: req.user.id});
        };
        
        
        
        
    } else {
        res.redirect('/');
    }
});


app.get('/signup', (req, res)=>{
    const validMessagesSignup = [
        "USERNAME_TAKEN",
        "EMAIL_ALREADY_REGISTERED",
        "INTERNAL_ERROR"
    ];

    if (req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        if (validMessagesSignup.indexOf(req.query.failMessage)+1) {
            res.render('signup.ejs', {err: req.query.failMessage});
        } else{
            res.render('signup.ejs')
        }
        
    }
 
});


app.get('/email-verification', (req, res)=>{
    validMessagesVer = [
        
        "ALREADY_SENT",
        "NOT_REGISTERED"
    ];
    
    if (req.isAuthenticated()){
        res.redirect('/');
    } else{
        if(req.session.loggedNeedsVerification){
            if(validMessagesVer.indexOf(req.query.failMessage)+1){
                
                res.render('verification.ejs', {err: req.query.failMessage});
            }else{
                
                res.render('verification.ejs');
            }
            
        }else{
            res.redirect('/');
        }
        
    }
});



//to config the port if needed from the environment file
var port = process.env.PORT || loginConfiguration.port;



//setting the app to listen on the specifiied port
app.listen(port, () => {
    console.log(`server listening on port ${port}. Logged at: ${timeForLog()}`);
})



