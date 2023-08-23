const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const { User } = require("../schemas/users");

const { HttpError, ctrlWrapper } = require("../helpers");

const { SECRET_KEY } = process.env;

async function register(req, res) {
  const { password, email } = req.body;
  const user = await User.findOne({ email });

  if (user) {
    throw HttpError(409, "Email in use");
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const { subscription } = await User.create({
    ...req.body,
    password: hashPassword,
  });

  res.status(201).json({
    user: { email, subscription },
  });
}

async function login(req, res) {
  const { password, email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw HttpError(401, "Email or password is wrong");
  }

  const passwordCompare = await bcrypt.compare(password, user.password);

  if (!passwordCompare) {
    throw HttpError(401, "Email or password invalid");
  }

  const payload = {
    id: user._id,
  };

  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });
  const { subscription } = await User.findByIdAndUpdate(user._id, { token });

  res.status(200).json({
    token,
    user: {
      email,
      subscription,
    },
  });
}

async function logout(req, res) {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: "" });
  res.status(204).send();
}

async function current(req, res) {
  const { email, subscription } = req.user;
  res.status(200).json({ email, subscription });
}

async function subUpdate(req, res) {
  const { _id } = req.user;
  const { subscription: newSub } = req.body;
  const { email, subscription } = await User.findByIdAndUpdate(_id, {
    newSub,
  });
  res.status(200).json({ email, subscription });
}

module.exports = {
  register: ctrlWrapper(register),
  login: ctrlWrapper(login),
  logout: ctrlWrapper(logout),
  current: ctrlWrapper(current),
  subUpdate: ctrlWrapper(subUpdate),
};