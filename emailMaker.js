
const jwt = require('jsonwebtoken');
const loginConfiguration = JSON.parse(process.env.loginConfiguration);



const newEmail = (recipient, sender, baseURL)=>{
    
    
    
    
    
    
    token = jwt.sign({id: 2, email: recipient, exp: Math.floor(Date.now() / 1000) + parseInt(loginConfiguration.emailVerification.tokenMaxAgeSecond),
    iat: Math.floor(Date.now())}, loginConfiguration.emailVerification.keyForToken)
    
    verificationLink = `${baseURL}/users/emailvalidation/${token}`
    
    
    return {
       from: sender,
        to: recipient,
        subject: 'Email Verification',
        text: `Link : ${verificationLink}`,
        html:`<html>Link : ${verificationLink}</html>`
      }
};








exports.newEmail = newEmail;