const db = require('../config/db');

// 1. Find Matching Volunteers (FR17 / User Story 1 & 2)
// Matches category, mode, and checks day availability from the student's selected date
exports.findVolunteers = async (req, res) => {
    const { category, mode, date, time } = req.query;

    if (!category || !mode) {
        return res.status(400).json({ message: 'Category and mode are required parameters.' });
    }

    // 1. Calculate Day of Week from the passed date string (e.g., '2026-10-25')
    let dayName = '';
    if (date) {
        const parsedDate = new Date(date + 'T00:00:00'); // 'T00:00:00' prevents timezone rollback
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        dayName = days[parsedDate.getDay()]; // e.g., 'Sunday'
    }

    try {
        let query = `
            SELECT
                v.Volunteer_id,
                u.User_name,
                u.Email,
                v.Availability,
                v.Preferred_Support_Mode,
                v.Bio,
                GROUP_CONCAT(DISTINCT c_all.Category_name SEPARATOR ', ') AS All_Categories
            FROM Volunteer v
                     JOIN User u ON v.User_id = u.User_id
                     JOIN Volunteer_Category vc_filter ON v.Volunteer_id = vc_filter.Volunteer_id
                     JOIN Category c_filter ON vc_filter.Category_id = c_filter.Category_id
                     JOIN Volunteer_Category vc_all ON v.Volunteer_id = vc_all.Volunteer_id
                     JOIN Category c_all ON vc_all.Category_id = c_all.Category_id
            WHERE c_filter.Category_name = ?
              AND (v.Preferred_Support_Mode = ? OR v.Preferred_Support_Mode = 'Both')
        `;

        const queryParams = [category, mode];

        // Filter by day of week if date was provided
        if (dayName) {
            query += ` AND (v.Availability LIKE ? OR v.Availability LIKE ?)`;
            queryParams.push(`%${dayName}%`, `%${dayName.substring(0, 3)}%`);
        }

        query += ` GROUP BY v.Volunteer_id, u.User_name, u.Email, v.Availability, v.Preferred_Support_Mode, v.Bio`;

        const [volunteers] = await db.query(query, queryParams);

        // 2. Filter by Time Window in Minutes (e.g., "01:00" -> 60 minutes)
        let matched = volunteers;
        if (time) {
            // Clean out any stray 'AM' or 'PM' strings
            let cleanTime = time.trim();
            let [hStr, mStr] = cleanTime.replace(/(AM|PM|\s)/gi, '').split(':');
            let h = parseInt(hStr, 10);
            let m = parseInt(mStr || '0', 10);

            if (cleanTime.toUpperCase().includes('PM') && h < 12) h += 12;
            if (cleanTime.toUpperCase().includes('AM') && h === 12) h = 0;

            const reqMinutes = h * 60 + m;

            if (!isNaN(reqMinutes)) {
                matched = volunteers.filter(vol => {
                    return checkAvailabilityWindow(vol.Availability, reqMinutes);
                });
            }
        }

        return res.status(200).json(matched);
    } catch (err) {
        console.error('Error in findVolunteers:', err);
        return res.status(500).json({ message: 'Server error matching volunteers.' });
    }
};

// Helper function to verify requested minutes fall inside the volunteer's slot
function checkTimeWindow(availText, reqMinutes) {
    if (!availText || reqMinutes === null || isNaN(reqMinutes)) return true;

    // Pattern 1: 24-hour range like "(09:00 - 15:00)" or "09:00-15:00"
    const m24 = availText.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (m24) {
        const start = parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
        const end = parseInt(m24[3], 10) * 60 + parseInt(m24[4], 10);
        return reqMinutes >= start && reqMinutes <= end;
    }

    // Pattern 2: 12-hour range like "12pm to 3pm" or "9am - 12pm"
    const m12 = availText.match(/(\d{1,2})\s*(am|pm)\s*(?:to|-)\s*(\d{1,2})\s*(am|pm)/i);
    if (m12) {
        let startH = parseInt(m12[1], 10);
        if (m12[2].toLowerCase() === 'pm' && startH < 12) startH += 12;
        if (m12[2].toLowerCase() === 'am' && startH === 12) startH = 0;

        let endH = parseInt(m12[3], 10);
        if (m12[4].toLowerCase() === 'pm' && endH < 12) endH += 12;
        if (m12[4].toLowerCase() === 'am' && endH === 12) endH = 0;

        return reqMinutes >= (startH * 60) && reqMinutes <= (endH * 60);
    }

    return true;
}
// Evaluates whether requested minute-of-day falls inside volunteer's slot
// Evaluates whether requested minute-of-day falls inside volunteer's schedule
function checkAvailabilityWindow(availText, reqMinutes) {
    if (!availText || reqMinutes === null || isNaN(reqMinutes)) return true;

    // Pattern 1: 24-hour formats e.g. "09:00 - 15:00" or "(09:00 - 15:00)"
    const m24 = availText.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (m24) {
        const start = parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
        const end = parseInt(m24[3], 10) * 60 + parseInt(m24[4], 10);
        return reqMinutes >= start && reqMinutes <= end;
    }

    // Pattern 2: 12-hour formats e.g. "12pm to 3pm", "9am to 12pm", "10am - 12pm"
    const m12 = availText.match(/(\d{1,2})\s*(am|pm)\s*(?:to|-)\s*(\d{1,2})\s*(am|pm)/i);
    if (m12) {
        let startH = parseInt(m12[1], 10);
        let startPeriod = m12[2].toLowerCase();
        if (startPeriod === 'pm' && startH < 12) startH += 12;
        if (startPeriod === 'am' && startH === 12) startH = 0;

        let endH = parseInt(m12[3], 10);
        let endPeriod = m12[4].toLowerCase();
        if (endPeriod === 'pm' && endH < 12) endH += 12;
        if (endPeriod === 'am' && endH === 12) endH = 0;

        const startMin = startH * 60;
        const endMin = endH * 60;

        return reqMinutes >= startMin && reqMinutes <= endMin;
    }

    return false; // If a time was requested but no valid schedule range matches, exclude
}
// Helper: Convert "HH:MM" (e.g., "01:00" or "14:30") to minutes from midnight
function convertTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.trim().split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// Helper: Check if requested time falls within availability text like "(09:00 - 15:00)" or "12pm to 3pm"
function isVolunteerAvailableAtTime(availabilityStr, requestedMinutes) {
    if (!availabilityStr || requestedMinutes === null) return true;

    // Regex to extract 24-hour patterns like "09:00 - 15:00" or "09:00-15:00"
    const range24Match = availabilityStr.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (range24Match) {
        const startMin = parseInt(range24Match[1], 10) * 60 + parseInt(range24Match[2], 10);
        const endMin = parseInt(range24Match[3], 10) * 60 + parseInt(range24Match[4], 10);
        return requestedMinutes >= startMin && requestedMinutes <= endMin;
    }

    // Regex to extract 12-hour patterns like "12pm to 3pm" or "9am to 12pm"
    const range12Match = availabilityStr.match(/(\d{1,2})\s*(am|pm)\s*(?:to|-)\s*(\d{1,2})\s*(am|pm)/i);
    if (range12Match) {
        let startHour = parseInt(range12Match[1], 10);
        if (range12Match[2].toLowerCase() === 'pm' && startHour < 12) startHour += 12;
        if (range12Match[2].toLowerCase() === 'am' && startHour === 12) startHour = 0;

        let endHour = parseInt(range12Match[3], 10);
        if (range12Match[4].toLowerCase() === 'pm' && endHour < 12) endHour += 12;
        if (range12Match[4].toLowerCase() === 'am' && endHour === 12) endHour = 0;

        const startMin = startHour * 60;
        const endMin = endHour * 60;
        return requestedMinutes >= startMin && requestedMinutes <= endMin;
    }

    // If no parseable time range is specified in the string, default to true
    return true;
}

// 2. Submit a Support Request (FR19 / User Story 1 & 2)
exports.createSupportRequest = async (req, res) => {
    const { userId, volunteerId, categoryId, description, preferredDate, preferredTime, supportMode } = req.body;

    if (!userId || !categoryId || !description || !preferredDate || !preferredTime || !supportMode) {
        return res.status(400).json({ message: 'Missing required request fields.' });
    }

    try {
        const query = `
            INSERT INTO Support_request
            (User_id, Volunteer_id, Category_id, Description, Preferred_date, Preferred_time, Support_mode, Request_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
        `;
        const [result] = await db.query(query, [
            userId, volunteerId || null, categoryId, description, preferredDate, preferredTime, supportMode
        ]);

        res.status(201).json({ message: 'Request created successfully', requestId: result.insertId });
    } catch (error) {
        console.error('Error creating request:', error);
        res.status(500).json({ message: 'Database error creating request' });
    }
};

// 3. Fetch requests for Student Tracking View (FR12 / User Story 3)
exports.getStudentRequests = async (req, res) => {
    const { userId } = req.params;

    try {
        const query = `
            SELECT
                sr.Request_id,
                sr.Category_id,
                sr.Description,
                sr.Preferred_date,
                sr.Preferred_time,
                sr.Support_mode,
                sr.Request_status,
                sr.created_at,
                c.Category_name,
                u.User_name AS Volunteer_name
            FROM Support_request sr
                     JOIN Category c ON sr.Category_id = c.Category_id
                     LEFT JOIN Volunteer v ON sr.Volunteer_id = v.Volunteer_id
                     LEFT JOIN User u ON v.User_id = u.User_id
            WHERE sr.User_id = ?
            ORDER BY sr.created_at DESC
        `;
        const [rows] = await db.query(query, [userId]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching student requests:', error);
        res.status(500).json({ message: 'Database error fetching student requests' });
    }
};

// 4. Fetch incoming requests for Volunteer Inbox (FR9 / User Story 5)
exports.getVolunteerInbox = async (req, res) => {
    const { volunteerId } = req.params;

    try {
        const query = `
            SELECT
                sr.Request_id,
                sr.Category_id,
                sr.Description,
                sr.Preferred_date,
                sr.Preferred_time,
                sr.Support_mode,
                sr.Request_status,
                sr.created_at,
                c.Category_name,
                u.User_name AS Student_name
            FROM Support_request sr
                     JOIN Category c ON sr.Category_id = c.Category_id
                     JOIN User u ON sr.User_id = u.User_id
                     LEFT JOIN Volunteer v ON sr.Volunteer_id = v.Volunteer_id
            WHERE (sr.Volunteer_id = ? OR v.User_id = ?)
              AND sr.Request_status = 'Pending'
            ORDER BY sr.created_at ASC
        `;
        const [rows] = await db.query(query, [volunteerId, volunteerId]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching volunteer inbox:', error);
        res.status(500).json({ message: 'Database error fetching inbox' });
    }
};

// 5. Accept or Reject Request (FR10, FR11 / User Story 7)
exports.updateRequestStatus = async (req, res) => {
    const { requestId } = req.params;
    const { status } = req.body; // 'Accepted' or 'Rejected'

    if (!['Accepted', 'Rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
    }

    try {
        const query = `UPDATE Support_request SET Request_status = ? WHERE Request_id = ?`;
        const [result] = await db.query(query, [status, requestId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }

        res.json({ message: `Request successfully marked as ${status}` });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Database error updating status' });
    }
};

// Assign chosen volunteer to the created request (FR19)
exports.assignVolunteerToRequest = async (req, res) => {
    const { requestId } = req.params;
    const { volunteerId } = req.body;

    if (!volunteerId) {
        return res.status(400).json({ message: 'Volunteer ID is required.' });
    }

    try {
        const query = `
            UPDATE Support_request 
            SET Volunteer_id = ?, Request_status = 'Pending' 
            WHERE Request_id = ?
        `;
        const [result] = await db.query(query, [volunteerId, requestId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Request not found.' });
        }

        return res.status(200).json({ message: 'Volunteer assigned successfully.' });
    } catch (error) {
        console.error('Error assigning volunteer:', error);
        return res.status(500).json({ message: 'Database error assigning volunteer.' });
    }
};

exports.reselectVolunteer = async (req, res) => {
    const { requestId } = req.params;
    const { newVolunteerId } = req.body;

    if (!newVolunteerId) {
        return res.status(400).json({ message: 'New volunteer ID is required.' });
    }

    try {
        const query = `
            UPDATE Support_request 
            SET Volunteer_id = ?, Request_status = 'Pending', created_at = CURRENT_TIMESTAMP
            WHERE Request_id = ?
        `;
        const [result] = await db.query(query, [newVolunteerId, requestId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Request not found.' });
        }

        res.json({ message: 'Volunteer updated successfully. Status reset to Pending.' });
    } catch (error) {
        console.error('Error reselecting volunteer:', error);
        res.status(500).json({ message: 'Database error reselecting volunteer.' });
    }
};


exports.updateSupportRequest = async (req, res) => {
    const { requestId } = req.params;
    const { categoryId, description, preferredDate, preferredTime, supportMode } = req.body;

    try {
        const query = `
            UPDATE Support_request 
            SET Category_id = ?, Description = ?, Preferred_date = ?, Preferred_time = ?, Support_mode = ?, Request_status = 'Pending', Volunteer_id = NULL
            WHERE Request_id = ?
        `;
        const [result] = await db.query(query, [
            categoryId, description, preferredDate, preferredTime, supportMode, requestId
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }

        res.json({ message: 'Request criteria updated successfully', requestId });
    } catch (error) {
        console.error('Error updating request criteria:', error);
        res.status(500).json({ message: 'Database error updating request' });
    }
};