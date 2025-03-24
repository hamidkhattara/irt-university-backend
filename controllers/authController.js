const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register User
const registerUser = async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: '⚠️ Email is already in use' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save new user
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });
    await newUser.save();

    res.status(201).json({
      message: '🎉 Registration successful!',
      user: { _id: newUser._id, fullName: newUser.fullName, email: newUser.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Server error. Please try again later.' });
  }
};

// Login User
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: '⚠️ Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: '⚠️ Invalid email or password' });
    }

    // Generate JWT Token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: '✅ Login successful!',
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role, // Ensure the role is included in the response
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ Server error. Please try again later.' });
  }
};

// Export both functions
module.exports = {
  registerUser,
  loginUser,
};