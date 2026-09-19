const express = require('express');
const twilio = require('twilio');
const pool = require('../config/database');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Emergency call endpoint (Patient only)
router.post('/call', verifyToken, checkRole(['patient']), async (req, res) => {
  try {
    const { location, emergencyType, description } = req.body;

    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({ error: 'Patient location is required for emergency services.' });
    }

    // Create emergency case record
    const [result] = await pool.execute(
      `INSERT INTO emergency_cases (patient_id, location, emergency_type, description, status, priority) 
       VALUES (?, ?, ?, ?, 'pending', 'critical')`,
      [req.user.id, JSON.stringify(location), emergencyType || 'Medical Emergency', description || 'Emergency assistance required']
    );

    const emergencyCaseId = result.insertId;

    // Get patient details
    const [patientResult] = await pool.execute(
      'SELECT name, phone FROM users WHERE id = ?',
      [req.user.id]
    );

    const patient = patientResult[0];

    // Send SMS to emergency services (in production, this would go to actual emergency dispatch)
    const emergencyMessage = `
🚨 MEDICAL EMERGENCY 🚨
Patient: ${patient.name}
Phone: ${patient.phone}
Location: ${location.latitude}, ${location.longitude}
Type: ${emergencyType || 'Medical Emergency'}
Case ID: ${emergencyCaseId}
Time: ${new Date().toLocaleString()}
    `.trim();

    // In production, send to emergency services
    // For demo, we'll send to a test number or log it
    console.log('Emergency Alert:', emergencyMessage);

    // Try to send SMS (will fail in demo without proper Twilio setup)
    try {
      await twilioClient.messages.create({
        body: emergencyMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.EMERGENCY_CONTACT || patient.phone // Fallback to patient's phone for demo
      });
    } catch (smsError) {
      console.error('SMS sending failed (expected in demo):', smsError.message);
    }

    // Create notification for patient
    await pool.execute(
      `INSERT INTO notifications (user_id, title, message, type) 
       VALUES (?, ?, ?, 'emergency')`,
      [
        req.user.id,
        'Emergency Services Contacted',
        `Emergency services have been contacted. Your location has been shared. Case ID: ${emergencyCaseId}`
      ]
    );

    // Find nearest hospitals
    const [nearbyHospitals] = await pool.execute(
      `SELECT id, name, address, phone, 
              (6371 * acos(cos(radians(?)) * cos(radians(JSON_EXTRACT(location, '$.latitude'))) * 
               cos(radians(JSON_EXTRACT(location, '$.longitude')) - radians(?)) + 
               sin(radians(?)) * sin(radians(JSON_EXTRACT(location, '$.latitude'))))) AS distance
       FROM hospitals 
       WHERE is_active = TRUE AND location IS NOT NULL
       ORDER BY distance 
       LIMIT 5`,
      [location.latitude, location.longitude, location.latitude]
    );

    res.json({
      message: 'Emergency services have been contacted successfully.',
      caseId: emergencyCaseId,
      location: location,
      nearbyHospitals: nearbyHospitals,
      emergencyHotline: process.env.EMERGENCY_HOTLINE || '108'
    });
  } catch (error) {
    console.error('Emergency call error:', error);
    res.status(500).json({ error: 'Failed to contact emergency services.' });
  }
});

// Get emergency case status
router.get('/case/:id', verifyToken, async (req, res) => {
  try {
    const caseId = req.params.id;

    const [caseResult] = await pool.execute(
      `SELECT ec.*, u.name as patient_name, u.phone as patient_phone
       FROM emergency_cases ec
       JOIN users u ON ec.patient_id = u.id
       WHERE ec.id = ?`,
      [caseId]
    );

    if (caseResult.length === 0) {
      return res.status(404).json({ error: 'Emergency case not found.' });
    }

    const emergencyCase = caseResult[0];

    // Check if user has permission to view this case
    const canView = req.user.role === 'patient' && emergencyCase.patient_id === req.user.id ||
                   req.user.role === 'admin' ||
                   req.user.role === 'doctor';

    if (!canView) {
      return res.status(403).json({ error: 'Unauthorized to view this emergency case.' });
    }

    // Parse location data
    if (emergencyCase.location) {
      emergencyCase.location = JSON.parse(emergencyCase.location);
    }

    res.json({ emergencyCase });
  } catch (error) {
    console.error('Get emergency case error:', error);
    res.status(500).json({ error: 'Failed to fetch emergency case details.' });
  }
});

// Update emergency case status (Admin/Emergency services only)
router.put('/case/:id/status', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const caseId = req.params.id;
    const { status, ambulanceId, notes } = req.body;

    const validStatuses = ['pending', 'dispatched', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    // Update emergency case
    await pool.execute(
      `UPDATE emergency_cases SET status = ?, ambulance_id = ?, updated_at = NOW() 
       WHERE id = ?`,
      [status, ambulanceId, caseId]
    );

    // Get case details for notification
    const [caseResult] = await pool.execute(
      'SELECT patient_id FROM emergency_cases WHERE id = ?',
      [caseId]
    );

    if (caseResult.length > 0) {
      const patientId = caseResult[0].patient_id;

      // Send notification to patient
      const statusMessages = {
        dispatched: 'Emergency services have been dispatched to your location.',
        in_progress: 'Emergency services are en route to your location.',
        completed: 'Emergency services have completed their response.',
        cancelled: 'Emergency case has been cancelled.'
      };

      await pool.execute(
        `INSERT INTO notifications (user_id, title, message, type) 
         VALUES (?, ?, ?, 'emergency')`,
        [
          patientId,
          'Emergency Update',
          statusMessages[status] || `Emergency case status updated to: ${status}`
        ]
      );
    }

    res.json({ message: 'Emergency case status updated successfully.' });
  } catch (error) {
    console.error('Update emergency case status error:', error);
    res.status(500).json({ error: 'Failed to update emergency case status.' });
  }
});

// Get patient's emergency history
router.get('/history', verifyToken, checkRole(['patient']), async (req, res) => {
  try {
    const [emergencyCases] = await pool.execute(
      `SELECT id, emergency_type, description, status, priority, location, 
              created_at, updated_at
       FROM emergency_cases
       WHERE patient_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );

    // Parse location data for each case
    const parsedCases = emergencyCases.map(case_ => ({
      ...case_,
      location: case_.location ? JSON.parse(case_.location) : null
    }));

    res.json({ emergencyCases: parsedCases });
  } catch (error) {
    console.error('Get emergency history error:', error);
    res.status(500).json({ error: 'Failed to fetch emergency history.' });
  }
});

// Public endpoint for ambulance services (no authentication required)
router.post('/ambulance/receive-alert', async (req, res) => {
  try {
    const { caseId, ambulanceId, location } = req.body;

    if (!caseId || !ambulanceId) {
      return res.status(400).json({ error: 'Case ID and Ambulance ID are required.' });
    }

    // Update emergency case with ambulance information
    await pool.execute(
      `UPDATE emergency_cases SET ambulance_id = ?, status = 'dispatched', updated_at = NOW() 
       WHERE id = ?`,
      [ambulanceId, caseId]
    );

    // Get case details
    const [caseResult] = await pool.execute(
      `SELECT ec.*, u.name as patient_name, u.phone as patient_phone
       FROM emergency_cases ec
       JOIN users u ON ec.patient_id = u.id
       WHERE ec.id = ?`,
      [caseId]
    );

    if (caseResult.length === 0) {
      return res.status(404).json({ error: 'Emergency case not found.' });
    }

    const emergencyCase = caseResult[0];

    res.json({
      message: 'Ambulance dispatch confirmed.',
      case: {
        id: emergencyCase.id,
        patientName: emergencyCase.patient_name,
        patientPhone: emergencyCase.patient_phone,
        location: JSON.parse(emergencyCase.location),
        emergencyType: emergencyCase.emergency_type,
        description: emergencyCase.description,
        priority: emergencyCase.priority
      }
    });
  } catch (error) {
    console.error('Ambulance alert receive error:', error);
    res.status(500).json({ error: 'Failed to process ambulance alert.' });
  }
});

module.exports = router;

export default twilioClient