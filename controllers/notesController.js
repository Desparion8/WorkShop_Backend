const User = require('../models/User');
const Note = require('../models/Note');
const asyncHandler = require('express-async-handler');

//@desc Get all notes
//@route GET /notes
//@access Private
const getAllNotes = asyncHandler(async (req, res) => {
	const notes = await Note.find().lean();
	if (!notes?.length) {
		return res.status(400).json({ message: 'Nie znaleziono notatek' });
	}

	const noteWithUser = await Promise.all(
		notes.map(async (note) => {
			const user = await User.findById(note.user).lean().exec();
			return { ...note, username: user.username };
		})
	);

	res.json(noteWithUser);
});

//@desc Create new note
//@route POST /notes
//@access Private
const createNewNote = asyncHandler(async (req, res) => {
	const { user, title, text } = req.body;

	//Confirm data
	if (!user || !title || !text) {
		return res.status(400).json({ message: 'Wszystkie pola są wymagane' });
	}
	// Check for duplicate
	const duplicate = await Note.findOne({ title })
		.collation({ locale: 'pl', strength: 2 })
		.lean()
		.exec();
	if (duplicate) {
		return res.status(400).json({ message: 'Dany tytuł już istnieje w bazie' });
	}
	// Create and store new note
	const note = await Note.create({ user, title, text });
	if (note) {
		return res.status(201).json({ message: 'Nowa notatka została utworzona' });
	} else {
		return res.status(400).json({ message: 'Notatka nie została utworzona' });
	}
});

//@desc Update note
//@route PATCH /notes
//@access Private
const updateNote = asyncHandler(async (req, res) => {
	const { id, user, title, text, completed } = req.body;

	// Confirm data
	if (!id || !user || !title || !text || typeof completed !== 'boolean') {
		return res.status(400).json({ message: 'Wszystkie pola są wymagane' });
	}
	// Find note
	const note = await Note.findById(id).exec();

	if (!note) {
		return res.status(400).json({ message: 'Nota o podanym ID nie istnieje' });
	}
	// Check for duplicate title
	const duplicate = await Note.findOne({ title })
		.collation({ locale: 'pl', strength: 2 })
		.lean()
		.exec();

	if (duplicate && duplicate?._id.toString() !== id) {
		return res
			.status(409)
			.json({ message: 'Istnieje już nota o podanym tytule' });
	}
	// Update note
	note.user = user;
	note.title = title;
	note.text = text;
	note.completed = completed;

	const updateNote = await note.save();

	res.json({ message: `Nota ${updateNote.title} została zaaktualizowana` });
});

//@desc Delete note
//@route DELETE /notes
//@access Private
const deleteNote = asyncHandler(async (req, res) => {
	const { id } = req.body;

	// Check note to exists
	if (!id) {
		return res.status(400).json({ message: 'Id noty jest wymagane' });
	}
	const note = await Note.findById(id).exec();
	if (!note) {
		return res.status(400).json({ message: 'Nie istnieje nota o podanym ID' });
	}
	const result = await note.deleteOne();
	const replay = `Nota ${result.title} with ID ${result._id} została usunęta`;

	res.json(replay);
});

module.exports = { getAllNotes, createNewNote, updateNote, deleteNote };
