const express = require('express');
const router = express.Router();
const matchingController = require('../controllers/matchingController');

// Find matching volunteers
router.get('/volunteers', matchingController.findVolunteers);
router.get('/skills', matchingController.getSkillsByCategory);

// Student creates a new request
router.post('/requests', matchingController.createSupportRequest);

// Student dashboard list
router.get('/requests/student/:userId', matchingController.getStudentRequests);

// Volunteer inbox queue
router.get('/requests/volunteer/:volunteerId', matchingController.getVolunteerInbox);

// Volunteer accepts or rejects
router.patch('/requests/:requestId/status', matchingController.updateRequestStatus);

router.patch('/requests/:requestId/assign', matchingController.assignVolunteerToRequest);
router.patch('/requests/:requestId/reselect', matchingController.reselectVolunteer);
router.put('/requests/:requestId', matchingController.updateSupportRequest);
module.exports = router;