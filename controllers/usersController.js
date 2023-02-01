const User = require('../models/User');
const Note = require('../models/Note');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');

//@desc Get all users
//@route GET /users
//@access Private
const getAllUsers = asyncHandler(async (req, res) => {
	const users = await User.find().select('-password').lean();
	if (!users?.length) {
		return res.status(400).json({ message: 'Nie znaleziono użytkowników' });
	}
	res.json(users);
});

//@desc Create new user
//@route POST /users
//@access Private
const createNewUser = asyncHandler(async (req, res) => {
	const { username, password, roles } = req.body;
	// Confirm data
	if (!username || !password || !Array.isArray(roles) || !roles.length) {
		return res.status(400).json({ message: 'Wszystkie pola są wymagane' });
	}
	// Check for duplicate
	const duplicate = await User.findOne({ username }).collation({locale:'pl', strength:2}).lean().exec();
	if (duplicate) {
		return res
			.status(409)
			.json({ message: 'Użytkownik o podanym nicku juz istnieje' });
	}

	// Hash password
	const hashedPwd = await bcrypt.hash(password, 10); // salt rounds

	const userObject = {
		username,
		password: hashedPwd,
		roles,
	};
	// Create and store new user
	const user = await User.create(userObject);
	if (user) {
		res
			.status(201)
			.json({ message: `Nowy użytkownik ${username} został stworzony` });
	} else {
		res.status(400).json({ message: 'Nieprawidłowe dane' });
	}
});

//@desc Update a user
//@route PATCH /users
//@access Private
const updateUser = asyncHandler(async (req, res) => {
	const { id, username, roles, active, password } = req.body;
	// Confirm data
	if (
		!id ||
		!username ||
		!Array.isArray(roles) ||
		!roles.length ||
		typeof active !== 'boolean'
	) {
		return res.status(400).json({ message: 'Wszystkie pola są wymagane' });
	}

	const user = await User.findById(id).exec();

	if (!user) {
		return res.status(400).json({ message: 'Nie znaleziono uzytkownika' });
	}
	// Check for duplicate
	const duplicate = await User.findOne({ username }).collation({locale:'pl', strength:2}).lean().exec();
	// Allow updates to the original user
	if (duplicate && duplicate?._id.toString() !== id) {
		return res.status(409).json({ message: 'Duplikat użytkownika' });
	}
	user.username = username;
	user.roles = roles;
	user.active = active;
	if (password) {
		// Hash password
		user.password = await bcrypt.hash(password, 10);
	}
	const updateUser = await user.save();

	res.json({ message: ` Użytkownik ${updateUser.username} zaaktualizowany` });
});

//@desc Delete a user
//@route DELETE /users
//@access Private
const deleteUser = asyncHandler(async (req, res) => {
	const { id } = req.body;
	if (!id) {
		return res.status(400).json({ message: 'Id użytkownika jest wymagane' });
	}

	const note = await Note.findOne({ user: id }).lean().exec();
	if (note) {
		return res
			.status(400)
			.json({ message: 'Użytkownik ma przydzielone notatki' });
	}

	const user = await User.findById(id).exec();
	if (!user) {
		res.status(400).json({ message: 'Użytkownik nie istnieje' });
	}
	const result = await user.deleteOne();

	const replay = `Użytkownik ${result.username}  on ID ${result._id} został usunięty`;

	res.json(replay);
});

module.exports = {
	getAllUsers,
	createNewUser,
	updateUser,
	deleteUser,
};
