const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');


const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
const SECRET_KEY = 'my_super_secret_123!';


// MongoDB Local Connection
const MONGO_URI = "mongodb://0.0.0.0/auctionDB";
const PORT = 5000;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected (Local)"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model("User", UserSchema);

// Auction Schema
const AuctionItemSchema = new mongoose.Schema({
  name: String,
  description: String,
  startingBid: Number,
  highestBid: { type: Number, default: 0 },
  highestBidder: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  endTime: { type: Date, required: true },
  isClosed: { type: Boolean, default: false },
});

const AuctionItem = mongoose.model("AuctionItem", AuctionItemSchema);

// *User Signup (Encrypt Password)*
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User signed up successfully" });
  } catch (error) {
    res.status(500).json({ error: "Signup failed" });
  }
});

// *User Signin (Check Encrypted Password)*
app.post("/signin", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ message: "Signin successful", token });
  } catch (error) {
    console.error("Signin Error:", error);
    res.status(500).json({ error: "Signin failed" });
  }
});


// *Create Auction*
app.post("/auction", async (req, res) => {
  try {
    const { name, description, startingBid, endTime } = req.body;
    const newAuction = new AuctionItem({ name, description, startingBid, highestBid: startingBid, endTime });
    await newAuction.save();
    res.status(201).json({ message: "Auction created successfully", auction: newAuction });
  } catch (error) {
    res.status(500).json({ error: "Failed to create auction" });
  }
});

// *Place a Bid*
app.post("/bid/:id", async (req, res) => {
  try {
    const { bidAmount, bidderName } = req.body;
    const auction = await AuctionItem.findById(req.params.id);

    if (!auction) return res.status(404).json({ error: "Auction not found" });

    const currentTime = new Date();
    if (currentTime > auction.endTime) {
      auction.isClosed = true;
      await auction.save();
      return res.status(400).json({ error: "Auction has ended" });
    }

    if (bidAmount > auction.highestBid) {
      auction.highestBid = bidAmount;
      auction.highestBidder = bidderName;
      await auction.save();
      return res.json({ message: "Bid placed successfully", auction });
    } else {
      return res.status(400).json({ error: "Bid must be higher than current highest bid" });
    }
  } catch (error) {
    res.status(500).json({ error: "Bidding failed" });
  }
});

// *Get All Auctions*
app.get("/auctions", async (req, res) => {
  try {
    const auctions = await AuctionItem.find();
    res.json(auctions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch auctions" });
  }
});

// *Get Single Auction*
app.get("/auctions/:id", async (req, res) => {
  try {
    const auction = await AuctionItem.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: "Auction not found" });
    res.json(auction);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch auction" });
  }
});

// *Edit Auction*
app.put("/auction/:id", async (req, res) => {
  try {
    const { name, description, startingBid, endTime } = req.body;
    const auction = await AuctionItem.findByIdAndUpdate(
      req.params.id,
      { name, description, startingBid, endTime },
      { new: true }
    );
    if (!auction) return res.status(404).json({ error: "Auction not found" });
    res.json({ message: "Auction updated successfully", auction });
  } catch (error) {
    res.status(500).json({ error: "Failed to update auction" });
  }
});

// *Delete Auction*
app.delete("/auction/:id", async (req, res) => {
  try {
    const auction = await AuctionItem.findByIdAndDelete(req.params.id);
    if (!auction) return res.status(404).json({ error: "Auction not found" });
    res.json({ message: "Auction deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete auction" });
  }
});

// Live Auctions Route: Returns auctions that are still live.
app.get("/live-auctions", async (req, res) => {
  try {
    const now = new Date();
    // Find auctions where isClosed is false and endTime is greater than the current time.
    const liveAuctions = await AuctionItem.find({
      isClosed: false,
      endTime: { $gt: now }
    });
    res.json(liveAuctions);
  } catch (error) {
    console.error("Error fetching live auctions:", error);
    res.status(500).json({ error: "Failed to fetch live auctions" });
  }
});



// *Start Server*
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));