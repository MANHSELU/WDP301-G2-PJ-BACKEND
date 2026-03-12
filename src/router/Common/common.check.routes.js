// router/Common/common.check.routes.js
const express = require("express");
const router = express.Router();

router.get("/getprofile", (req, res) => {
    try {
        const user = res.locals.user; // ✅ đã có sẵn từ checkaccount middleware
        return res.status(200).json({ data: user });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});

module.exports = router;