import bcrypt from "bcrypt";
(async () => {
  const salt = await bcrypt.genSalt(10);
  console.log(salt);
  const hash = await bcrypt.hash("123456", salt);
  console.log(hash);
  const match = await bcrypt.compare("123456", hash);
  console.log(match);
})();
