//require modules
const jwt = require("jsonwebtoken");
require("dotenv").config();

//Middleware Function
const auth = (req, res, next) => {
  try {
    const bearerHeader = req.headers["authorization"];
    if (typeof bearerHeader !== "undefined") {
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.JWT_SECRET, (err, authData) => {
        if (err) {
          res.json({ result: err });
        } else {
          next();
        }
      });
    } else {
      return res
        .status(401)
        .json({ msg: "Token verification failed, authorization denied" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//Export Middleware
module.exports = auth;
