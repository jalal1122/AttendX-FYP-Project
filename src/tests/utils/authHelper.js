import jwt from "jsonwebtoken";

export const generateAuthToken = (mockUser) => {
  return jwt.sign(
    {
      _id: mockUser._id,
      email: mockUser.email,
      role: mockUser.role,
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m",
    }
  );
};