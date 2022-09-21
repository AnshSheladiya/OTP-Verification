//Require Modules
const express = require('express');
const cors=require('cors');
const auth=require('./Middleware/auth')
const morgan=require('morgan')
var bodyParser = require("body-parser");
var jwt=require('jsonwebtoken')
require("dotenv").config();
require('./config');



//set up express 
const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan('tiny'))
app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
      extended: true,
    })
  );


//setup env
const PORT = process.env.PORT || 5000;

//listen Server on port
app.listen(PORT, () => console.log(`The server has started on port: ${PORT}`));

//Routes
app.use("/users", require("./Routes/user.route"));

