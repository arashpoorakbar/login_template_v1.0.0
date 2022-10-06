//this a router for the /user path to handle the login and register



const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');

//this is in case one wants to use sqlite to store sessions
//const SQLiteStore = require('connect-sqlite3')(session);


const mysql = require('mysql2');
const bcrypt = require('bcrypt');



const emailMaker = require('./emailMaker.js');
const nodemailer = require('nodemailer');
const MYSQLStore = require('express-mysql-session')(session);

//body parsers to populate the request with parsed parameters
router.use(bodyParser.urlencoded({extended: true}));
router.use(bodyParser.text({ type: "text/plain" }));
router.use(bodyParser.json());

//importing configuration from .env which was populated in the index.js.
const loginConfiguration = JSON.parse(process.env.loginConfiguration);

const usersTable = loginConfiguration.users_table;
const emailConfig = loginConfiguration.email_config


//setting up the MYSQL connection
const connection = mysql.createPool(loginConfiguration.MYSQLConnection);

//this is not needed when using creatPool. but in case of createConnection it is needed.
//connection.connect();



const emailTransporter = nodemailer.createTransport(emailConfig);



const findUser = (username, cb)=>{
    

    connection.query(`SELECT * FROM ${usersTable} WHERE username = "${username}";`, (err, res, field)=>{
      
      if (err) {throw err} else {
        if (res[0]) {
          if (res[0].isActivated) {
            user = {id, username, password, email, isAdmin, accessLevel} = res[0];
            return cb(null, user);
          } else {
            user = {id, username, password, email} = res[0];
            return cb(new Error("USER_NOT_ACTIVATED"), user);
          }
        } else {
          return cb(new Error("USER_NOT_FOUND"), false);
        }
        
      }
    });
    
}


const passwordCheck = (user, password)=>{
   
    return bcrypt.compareSync(password, user.password);
    
}



passport.use(new LocalStrategy(
    function verify (username, password, done){
        findUser(username, function (err, user){
            
            
            if (err && err.message!="USER_NOT_ACTIVATED") {
              return done(err);
            }
            if (err && err.message=="USER_NOT_ACTIVATED"){
              if(passwordCheck(user, password)){
                
                return done(err);
                
              }else{
                
                return done(new Error("PASSWORD_INCORRECT"));
              }
            }
            if (!user) {return done(null, false);}
            if (!passwordCheck(user, password)) { return done(new Error("PASSWORD_INCORRECT"), false); }
            if (passwordCheck(user, password)) {
              
              return done(null, user);
            };
        });
    }
));





router.use(session({
    secret: loginConfiguration.sessionKey,
    resave: false,
    saveUninitialized: false,
    store: new MYSQLStore({}, connection.promise())
  }));
router.use(passport.session());



  passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, isAdmin: user.isAdmin, accessLevel: user.accessLevel});
    });
  });
//this defines the serialization of users so they could be tracked in a session. Here a user is known by its id and username.
//more importantly, this stores id and username in the session cookie, so one can access them wherever and whenever needed.
//Important, using passport js, the data serialized in this method will be available under req["user"] or req.user whenever needed in a session.

  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });





// a note here is that passport.authenticate() returns a function.
// the easiest use will be app.post('/', passport.authenticate('local', {object including filure and sucess redirect and flash messages}))
// However, one can somehow dissect it and define it in their own script.
// so to call that function (passport.authenticate()) you need to pass parameters to it.
// this is done like passport.authneticate()().
//in the second parantheses you would pass the common parameters for a middleware.
// so it chnages to passport.authenticate()(req, res, next)
// and the first parantheses contians what is required for setting up your passport strategy as you wish.
//Attention! in this usage since we are handling the strategy with our own script,
// the req.login() method must be called to finish the process, send a response, and add user to the session.
// and in the error cases return next(error) must be used to make passport avoid continuing the scheme and tryig to serialize the not authenticated user which can cause bugs and errors.

router.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    
    //!!!!WARNING!!!!
    //If username or password are empty the passport does not run the strategy.
    //As a result, no errors will be thrown and the credential-less user gets logged in.
    //this can be a serious bug and a disastrous vulnerability.
    //So, one has to make sure to handle requests with empty fields.
    //since in the signup page these inputs are required, an empty request could be a test of vulnerability or attack.

    if (!(req.body.username || req.body.password)){
      res.redirect('/');
      return next(new Error('WARNING_HACKER_ATTEMPT'));
    };


    if (err) {
      
      
      if (err.message == "USER_NOT_FOUND") {
    
        return next(res.redirect(`/login?failMessage=${err.message}`));
        
      };

      if (err.message == "USER_NOT_ACTIVATED") {
        req.session.loggedNeedsVerification = true;
        
        return next(res.redirect('/email-verification'));
      };

      if (err.message == "PASSWORD_INCORRECT") {
        
        return next(res.redirect(`/login?failMessage=${err.message}`));
      };

    } else {
      
      req.login(user, loginErr => {
        
        if (loginErr) {
          console.log("login error: ", loginErr)
          return next(loginErr);
        }
        
        if (user.isAdmin){
          otpToken = otpGenerator.generate(10,{specialChars: false});
          //Creating an OTP for admins session to be used for modfication of users.
          
          tokenForAdmin = jwt.sign({id: user.id,
          email: user.email,
          isAdmin: user.isAdmin,
          accessLevel: user.accessLevel,
          otp: otpToken,
          exp: Math.floor(Date.now() / 1000) + parseInt(loginConfiguration.admin_access.tokenMaxAgeSecond),
          iat: Math.floor(Date.now())
          },
          loginConfiguration.admin_access.keyForToken);
          
          res.cookie('authToken',tokenForAdmin, {maxAge: loginConfiguration.admin_access.tokenMaxAgeSecond*1000});
          
          emailTransporter.sendMail({
            from: emailConfig.auth.user,
            to: user.email,
            subject: "OTP for updating users",
            text: `this is the code ${otpToken}`
          },(adminEmailError,adminEmailInfo)=>{
            if (adminEmailError) {
              console.log(adminEmailError);
            } else{
              console.log(adminEmailInfo);
            };
          });
          
        };
        return next(res.redirect('/dashboard'));
      });    
  }
  })(req, res, next);
});






router.post('/logout', (req,res)=>{
  
  req.logout((logoutErr)=>{
    req.session.destroy((err)=>{
      res.clearCookie('connect.sid');
      res.redirect('/login');
    });
  });
  
  

});



router.post('/register', (req, res)=>{
  //this is to ensure declining spam requests not from signup page
  if (!(req.body.name || req.body.username || req.body.password || req.body.email)) {
    //A block strategy
    res.redirect('/');
  } else {
    connection.query(`SELECT * FROM ${usersTable} WHERE username="${req.body.username}" OR email="${req.body.email}";`, (dbFindError, dbFindResponse, field)=>{
      
      if (dbFindError) {
        console.log(dbFindError);
        res.redirect('/signup?failMessage=INTERNAL_ERROR')
      } else {
        if (dbFindResponse.length>0) {
          
          if(dbFindResponse.length == 1){
            if(dbFindResponse[0].email == req.body.email){
              res.redirect('/signup?failMessage=EMAIL_ALREADY_REGISTERED');
            } else{
              if(dbFindResponse[0].username == req.body.username){
                res.redirect('/signup?failMessage=USERNAME_TAKEN');
              }
            }
          }
          if (dbFindResponse.length == 2){
            if(dbFindResponse[0].email == req.body.email || dbFindResponse[1].email == req.body.email){
              res.redirect('/signup?failMessage=EMAIL_ALREADY_REGISTERED');
            } else{
              if(dbFindResponse[0].username == req.body.username || dbFindResponse[1].username == req.body.username){
                res.redirect('/signup?failMessage=USERNAME_TAKEN');
              }
            }
          }
          
          
        } else {
          const salt = bcrypt.genSaltSync(11);
          const hashedPassword = bcrypt.hashSync(req.body.password, salt);
          connection.query(`INSERT INTO ${usersTable} (id, username, password, name, lastname, accessLevel, registrationDate, isAdmin, email, isActivated) VALUES (UUID(), "${req.body.username}", "${hashedPassword}", "${req.body.name}", "${req.body.lastname}", 1, NOW(), false, "${req.body.email}", false);`, (dbInsertError, dbResregisterResponse, field)=>{
            if (dbInsertError){
              console.log(dbInsertError);
              res.redirect('/signup?failMessage=INTERNAL_ERROR');
            } else {
              if (dbResregisterResponse.affectedRows == 1) {
                baseURL = `${req.protocol}://${req.get('host')}`;
                
                
                emailTransporter.sendMail(emailMaker.newEmail(req.body.email, emailConfig.auth.user, baseURL), (emailError, emailInfo)=>{
                  if(emailError){
                    console.log(emailError)
                  } else{
                    console.log(emailInfo)
                  }
                });
                
                res.redirect('/login?failMessage=SUCCESSFUL_REGISTER')
              } else {
                res.redirect('/signup?failMessage=INTERNAL_ERROR');
              }
              
              
            }

          });
        }
      }
    });

  };
  
});




router.get('/emailvalidation/:token', (req,res)=>{
  

  //It is possible to check if the param is actually a token or not.
  
  jwt.verify(req.params.token, loginConfiguration.emailVerification.keyForToken, (error, decoded)=>{
    console.log(error)
    if (error) {
//////////////////Error handling./////// Could be later used to check the decoded JWT, in case one could hve the key and mess with it.
//For example a random OTP could be placed in the JWT when issuing and saved into DB to later check here.
    } else {
      connection.query(`UPDATE ${usersTable} SET isActivated = 1 WHERE email = "${decoded.email}";`, (sqlActiveError, activationRes, field)=>{
        if (sqlActiveError){
          res.send('internal error')
        } else {
          if (activationRes.affectedRows == 1) {
            delete req.session.loggedNeedsVerification;
            res.send('activated')
          }
        };
      });
      
    };
    
    
  });
});



//This is a function to be used in the middleware for synchronous queries to database.
async function asyncPromiseQuery(someQuery){
  connection.promise().query(someQuery).then((resfrompromise)=>{
    return resfrompromise
  })
}





router.post('/verification', (req, res)=>{
  //spam requests must be handled
  
  
  connection.query(`SELECT * FROM ${usersTable} WHERE email = "${req.body.emailToVerify}";`,(err, resDb, field)=>{
    if(err){
      res.status(500).send("Try again later!");
    }else{
      
      if (resDb[0]){
        if(resDb[0].isActivated){
          delete req.session.loggedNeedsVerification;
          res.redirect('/login?failMessage=ALREADY_ACTIVATED');

        } else {
         
          if(resDb[0].timeEmailSent && (((Date.now()/1000)-resDb[0].timeEmailSent))<(loginConfiguration.emailVerification.timeForResendSecond)){
            res.redirect('/email-verification?failMessage=ALREADY_SENT');
          }else{
            
            baseURL = `${req.protocol}://${req.get('host')}`;
            emailTransporter.sendMail(emailMaker.newEmail(req.body.emailToVerify, emailConfig.auth.user, baseURL), (emailError, emailInfo)=>{
              if(emailError){
                console.log(emailError)
              } else{
                connection.query(`UPDATE ${usersTable} SET timeEmailSent = '${Math.floor(Date.now()/1000)}' WHERE (email = '${req.body.emailToVerify}');`,(err)=>{
                  if(err){
                    console.log(err)
                  } else{
                    res.redirect('/');
                  }
                });
              }
            });

          }
        }
      } else {
        res.redirect('/email-verification?failMessage=NOT_REGISTERED');
      }
    }
    
  });


});




router.post('/updateusers/:token', (req, res)=>{
 
  var queryString = "";
  jwt.verify(req.cookies.authToken, loginConfiguration.admin_access.keyForToken, (cookieDecodeErr, decodedCookie)=>{
    
    if (cookieDecodeErr){
      req.logout((logoutErr)=>{
        req.session.destroy((err)=>{
          res.clearCookie('connect.sid');
          res.status(403).send('Forbidden request due to wrong credentials');
        });
      });
            

      console.log(cookieDecodeErr);
    } else {
      
      //this checks if the OTP passed in the submit form is same as the OTP decoded from JWT. For more security,
      //the OTP could be saved in the database and also checked here.
      if(decodedCookie.otp == req.params.token){
        
        queryString="";
        if (req.body.update){
          
          //Data validation can be done here if needed.
          
          
          req.body.update.forEach(userToUpdate => {
            
            queryString += `UPDATE ${usersTable} SET `;
            justcheck=false;
            Object.keys(userToUpdate).forEach((objKey)=>{
              if(objKey != "id"){
                if (!justcheck){
                  if(objKey == "password"){
                    const hashedPass = bcrypt.hashSync(userToUpdate[objKey], 11);
                    queryString += ` \`${objKey}\` = "${hashedPass}" `;
                  }else{
                    queryString += ` \`${objKey}\` = "${userToUpdate[objKey]}" `;
                    justcheck=true;
                  }
                  
                  
                }else{
                  queryString += `, \`${objKey}\` = "${userToUpdate[objKey]}" `;
                }
                
              }
              
             
            });
            queryString += ` WHERE id="${userToUpdate.id}";
            `;
          });
          
          
        }
        
        if(req.body.insert){
          //Data validation can be done here if needed.
          
          
          



          req.body.insert.forEach((userToInsert)=>{
            
            const syncRes = asyncPromiseQuery(`SELECT * FROM ${usersTable} WHERE username = "${userToInsert.username}";`)
            if (syncRes[0]){
              if (syncRes.username == userToInsert.username){
                //username is taken
                //pass
              }
            }else{
              //username is not taken
              
              queryCols = "id, registrationDate, isActivated";
              queryVals = `UUID(), NOW(), "0"`;
          
              Object.keys(userToInsert).forEach((objKeyInsert, indexinsert)=>{
                if(objKeyInsert != "id"){
                  if(objKeyInsert == "password"){

                    const hashedOne = bcrypt.hashSync(userToInsert[objKeyInsert], 11);
                    queryCols += ` ,\`${objKeyInsert}\``;
                    queryVals += ` ,"${hashedOne}"`;
                  }else{
                    queryCols += ` ,\`${objKeyInsert}\``;
                    queryVals += ` ,"${userToInsert[objKeyInsert]}"`;
                  }
                
              
              
                }
              });
              queryString += `INSERT INTO ${usersTable} (${queryCols}) VALUES (${queryVals});
              `;
            }


            

            
            
          });
          


          
        }

        if (req.body.delete) {
          
          //Data validation can be done here if needed.

          req.body.delete.forEach((userToDelete)=>{
            queryString += `DELETE FROM ${usersTable} WHERE id = "${userToDelete}";
            `;
          });


        }
        
        connection.query(queryString, (errorQuery, resultQuery, fieldQuery)=>{
          if (errorQuery){
            console.log(errorQuery);
            
            req.logout((logoutErr)=>{
              req.session.destroy((err)=>{
                res.clearCookie('connect.sid');
                res.status(400).send('bad request');
              });
            });
            
            

          } else {
            console.log(resultQuery)
            req.logout((logoutErr)=>{
              req.session.destroy((err)=>{
                res.clearCookie('connect.sid');
                res.status(200).send('changes made');
              });
            });
            
            
          }
        });

      }else{
        //wrong token
        req.logout((logoutErr)=>{
          req.session.destroy((err)=>{
            res.clearCookie('connect.sid');
            res.status(403).send('forbidden request. wrong credentials');
          });
        });
        
        
        
        
      }
    }
  });

  
  
  
});


router.get('/getall/:token', (req, res)=>{
  
  if (req.isAuthenticated){
    jwt.verify(req.cookies.authToken, loginConfiguration.admin_access.keyForToken, (tokenError, tokenDecoded)=>{
      
      if (tokenError) {
        console.log(tokenError);
        //Token errors other than expiry should be carefully taken care of.
      } else {
        
        
        //this also checks if the OTP submitted is equal to the OTP in the JWT. If it is also stroed in database it could be checked here.
        if (tokenDecoded.otp == req.params.token) {
          
          
          connection.query(`SELECT * FROM ${usersTable} WHERE accessLevel< "${req.user.accessLevel}";`, (error, response, field)=>{
            if (error){
              res.status(500).send('internal error');
            } else{
              res.json(response);
            }
          });
        } else {
          //This is important. It could be an error in typing and entering the OTP by admin.
          // However, must be carefully handled in case of spam requests.
        }
      }
    });

  } else {
    res.status(400).send('Error 400!');
  }
  
});




module.exports = router;