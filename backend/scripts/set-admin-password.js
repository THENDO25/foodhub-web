// Sets the admin password from ADMIN_PASSWORD. Use after importing an older
// database whose admin still has the default "admin123" password:
//   docker compose exec foodhub npm --prefix backend run set-admin-password
require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../db");
const { validatePassword } = require("../utils/password-policy");

const email = (process.env.ADMIN_EMAIL || "admin@foodhub.com").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const problem = password ? validatePassword(password, { email }) : "ADMIN_PASSWORD is not set.";
if (problem || password.startsWith("CHANGE_ME")) {
  console.error(`ADMIN_PASSWORD in backend/.env is not acceptable: ${problem || "placeholder value"}`);
  process.exit(1);
}
const result = db
  .prepare("UPDATE users SET password_hash = ? WHERE email = ? AND role = 'admin'")
  .run(bcrypt.hashSync(password, 12), email);
console.log(result.changes ? `Admin password updated for ${email}.` : `No admin account found for ${email}.`);
