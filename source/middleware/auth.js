const { getTokenFromHeader, verifyToken, getUserId } = require("../util/jwt");

// authMiddleware nhận mảng role
const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ message: "Invalid or expired token" });

    req.userId = getUserId(token);
    next();
  };
};

module.exports = authMiddleware;
