import mongoose from "mongoose"

const connectDB = async () => {
 try {
  if (!process.env.MONGO_URI || process.env.MONGO_URI.trim() === '') {
   throw new Error('MONGO_URI environment variable is not defined or empty');
  }
  await mongoose.connect(process.env.MONGO_URI)
  console.log("MongoDB connected")
 } catch (error) {
  console.error("MongoDB connection failed:", error)
  throw error;
 }
}

export default connectDB