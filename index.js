const express = require("express");
const app = express();
const dbfRoutes = require("./routes/dbfRoutes");

// Middleware
app.use(express.static("public"));
app.use(express.json());

// เรียกใช้งาน API Routes โดยเพิ่ม Prefix '/api'
app.use("/api", dbfRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
