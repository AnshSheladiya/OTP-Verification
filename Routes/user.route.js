//Require Model and Modules
const user = require("../Models/user.model");
const UserOTPVerification = require("../Models/otp.model");
const jwt = require("jsonwebtoken");
const express = require("express");
const nodemailer = require("nodemailer");
require("dotenv").config();

//set up express router
const router = express.Router();

// Set up NodeMailer
var transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

//Routers
router.post("/register", async (req, res) => {
  try {
    let { username, email, password } = req.body;

    //Validation
    var passFormat =
      /^(?=.*[0-9])(?=.*[a-z])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8}$/;
    var mailFormat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

    if (!username || !email || !password)
      return res
        .status(400)
        .json({ status: "Failed", msg: "Not all fields have been entered." });
    if (!email.match(mailFormat))
      return res
        .status(400)
        .json({
          status: "Failed",
          msg: "You have entered an invalid email address.",
        });
    if (!password.match(passFormat))
      return res.status(400).json({
        status: "Failed",
        msg: "Password must contain 8 character, 1 alphabet, 1 numeric and 1 special",
      });
    //Check Existing User
    const existingUser = await user.findOne({ email: email });
    if (existingUser && existingUser.verified == false)
      await user.deleteOne({ email });
    if (existingUser && existingUser.verified == true)
      return res
        .status(400)
        .json({
          status: "Failed",
          msg: "An account with this email already exists.",
        });
    //Register New User in mongoDB
    const newUser = new user({
      username: username,
      email: email,
      password: password,
      verified: false,
    });
    const savedUser = await newUser.save();
    sendOTPVerificationEmail(savedUser, res);
  } catch (err) {
    res.status(500).json({ status: "Failed", error: err.message });
  }
});

router.post("/verifyOTP/:_id", async (req, res) => {
  try {
      let data = await UserOTPVerification.find({ userid: req.params._id });
      console.log(data)
    if(data.length==0)
      throw new Error(
        "Account record doesn't exist or has been verified already.Please sign up or login."
      );    
    let email = data[0].email;
    let { otp } = req.body;
    //OTP validation
    var numbersFormate = /^[0-9]+$/;
    if (!otp || !(otp.length == 4) || !otp.match(numbersFormate)) {
      throw Error("Not OTP field have been entered.");
    } else {
      const UserOTPVerificationRecords = await UserOTPVerification.find({
        email,
      });
      if (UserOTPVerificationRecords.length <= 0) {
        //No Record Found
        throw new Error(
          "Account record doesn't exist or has been verified already.Please sign up or login."
        );
      } else {
        const LastOTP = UserOTPVerificationRecords.length;
        const { expiresAt } = UserOTPVerificationRecords[LastOTP - 1];
        const otpRecord = UserOTPVerificationRecords[LastOTP - 1].otp;
        if (expiresAt < Date.now()) {
          //User otp record has expired
          await UserOTPVerification.remove({ email });
          throw new Error("otp has expired.Please request Again.");
        } else {
          if (otp == otpRecord) {
            await user.updateOne({ email: email }, { verified: true });
            await UserOTPVerification.deleteMany({ email });
            res.json({
              status: "VERIFIED",
              msg: "user email verified successfully.",
            });
          } else {
            throw new Error("Invaild OTP passed check your inbox.");
          }
        }
      }
    }
  } catch (error) {
    res.json({
      status: "Failed",
      message: error.message,
    });
  }
});

//ResendOtp
router.post("/verifyOTP/resend/:_id", async (req, res) => {
  try {
    const savedUser = await user.findById({_id:req.params._id});
    console.log(savedUser.verified)
if(savedUser.verified==true) {
  return res
        .status(400)
        .json({ status: "Failed", message: "Email Already Verified." });
}
sendOTPVerificationEmail(savedUser, res);
  } catch (error) {
    res.json({
      status: "Failed",
      message: error.message,
    });
  }
});


router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    //check Email And Password is Right or Not
    let loggedUser = await user.findOne({ email: email, password: password });
    if (loggedUser == null)
      return res
        .status(400)
        .json({ status: "Failed", msg: "Invalid Details." });
    if (loggedUser.verified == false)
      return res
        .status(400)
        .json({ status: "Failed", msg: "Please Verified Email." });
    //create JWT token
    jwt.sign(
      { loggedUser },
      process.env.JWT_SECRET,
      { expiresIn: "300s" },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({status:"Success",token:token});
      }
    );
  } catch (err) {
    res.status(500).json({ status:"Failed",error: err.message });
  }
});

//Get One User details by id
router.get("/:id", async (req, res) => {
  let userDetail=await user.findById({_id:req.params.id});
  if(!userDetail){
    return res.status(400).json({message:"User detail not found."})
  }
 res.status(200).send(userDetail);
});

//send OTP Verification Email
const sendOTPVerificationEmail = async ({ _id, email }, res) => {
  try {
    //create otp by random function
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
    console.log(otp);
    //mail options
    var mailOptions = {
      from: "anshsheladiya83@gmail.com",
      to: `${email}`,
      subject: "Verify Your Email",
      html:
        "<h3>OTP for account verification is </h3>" +
        "<h1 style='font-weight:bold;'>" +
        otp +
        "</h1>",
    };

    // Send Email
    // transporter.sendMail(mailOptions, function (error, info) {
    //   if (error) {
    //     console.log(error);
    //   } else {
    //     console.log("Email sent: " + info.response);
    //   }
    // });
    //Add Otp data in mongodb
    const newOTPVerification = await new UserOTPVerification({
      userid: _id,
      email: email,
      otp: otp,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
    });
    const savedOTP = await newOTPVerification.save();
    res.json({
      status: "SUCCESS",
      message: "Verification OTP email sent",
      id: _id,
    });
  } catch (error) {
    res.json({
      status: "Failed",
      message: error.message,
    });
  }
};



//export router
module.exports = router;
