const express = require('express');
const router = express.Router();
const auth = require('../utils/jwtUtils');

const Time = require('../models/Time&Expenses');
const Expenses = require('../models/Expenses.js');
module.exports = router;

// Get user's time data
router.get('/times/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find time data for the specific user
    let timeData = await Time.findOne({ userid: userId });

    if (!timeData) {
      // If no time data exists, create a new entry
      timeData = new Time({
        userid: userId,
        time: [], // Initialize with an empty array for time entries
        comment: "" // Initialize comment as an empty string
      });
      await timeData.save(); // Save the new entry
      return res.status(201).json({ message: 'New time data created', timeData: [] });
    }

    // If time data exists, return it
    res.status(200).json({ timeData });
  } catch (error) {
    console.error('Error fetching time data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update or create user's time data
router.put('/times/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { date, projects, comment } = req.body;

    // Validate request
    if (!date || !projects || !Array.isArray(projects) || projects.length === 0) {
      return res.status(400).json({ message: 'Date and projects are required' });
    }

    const newTimeEntry = {
      date: new Date(date),
      projects: projects.map((project) => ({
        projectCode: project.code,
        hours: project.hours
      })),
    };

    // Check if there is already an entry for the same date
    let timeEntry = await Time.findOneAndUpdate(
      { userid: userId, 'time.date': new Date(date) },
      { $set: { 'time.$': newTimeEntry, comment: comment || "" } }, // Update the specific time entry for the date, including the comment
      { new: true }
    );

    if (!timeEntry) {
      // If no entry exists for that date, push new date and projects
      timeEntry = await Time.findOneAndUpdate(
        { userid: userId },
        { $push: { time: newTimeEntry }, comment: comment || "" }, // Add the new time entry with the comment
        { new: true, upsert: true } // Create new entry if it doesn't exist
      );
    }

    res.status(200).json({ message: 'Time entry updated successfully', timeEntry });
  } catch (error) {
    console.error('Error updating time data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/add-expense', async (req, res) => {
	const { prj, frmDate, toDate, type, amount, totalAmount, comment, imageUrl } = req.body;

	if (!prj || !frmDate || !toDate || !type || !amount || !totalAmount) {
		return res.status(400).json({ message: 'Please provide all the mandatory details.' });
	}

	try {
		const newExpense = new Expenses({ prj, frmDate, toDate, type, amount, totalAmount, comment, imageUrl });

		await newExpense.save();

		res.status(201).json({ message: 'Expense added successfully' });
	} catch (error) {
		res.status(500).json({ message: 'Server error', error });
	}
});

router.get('/expenses', auth, async (req, res) => {
	try {
		const expenses = await Expenses.find();
		res.status(200).json(expenses);
	} catch (error) {
		console.error('Server error:', error);
		res.status(500).json({ message: 'Server error', error });
	}
});

module.exports = router;
