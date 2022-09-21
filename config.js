//Require Mongoose
const mongoose=require('mongoose')

//Connect MongoDB
mongoose.connect(
    process.env.MONGODB_CONNECTION_STRING,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    },
    (err) => {
      if (err) throw err;
      console.log("MongoDB connected");
    }
  );
  
