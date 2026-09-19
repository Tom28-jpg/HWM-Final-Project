const express = require('express');
const pool = require('../config/database');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get admin profile and hospital info
router.get('/profile', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const [result] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.phone, u.gender, u.address,
              a.position, a.permissions,
              h.id as hospital_id, h.name as hospital_name, h.license_no,
              h.address as hospital_address, h.dean_name, h.phone as hospital_phone
       FROM users u
       JOIN admins a ON u.id = a.user_id
       JOIN hospitals h ON a.hospital_id = h.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Admin profile not found.' });
    }

    const admin = result[0];
    if (admin.permissions) {
      admin.permissions = JSON.parse(admin.permissions);
    }

    res.json({ admin });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ error: 'Failed to fetch admin profile.' });
  }
});

// Update admin profile
router.put('/profile', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { name, phone, address, position } = req.body;

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update user table
      await connection.execute(
        'UPDATE users SET name = ?, phone = ?, address = ?, updated_at = NOW() WHERE id = ?',
        [name, phone, address, req.user.id]
      );

      // Update admin table
      await connection.execute(
        'UPDATE admins SET position = ?, updated_at = NOW() WHERE user_id = ?',
        [position, req.user.id]
      );

      await connection.commit();
      res.json({ message: 'Profile updated successfully.' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Get hospital dashboard statistics
router.get('/dashboard/stats', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    // Get admin's hospital ID
    const [adminResult] = await pool.execute(
      'SELECT hospital_id FROM admins WHERE user_id = ?',
      [req.user.id]
    );

    if (adminResult.length === 0) {
      return res.status(404).json({ error: 'Admin profile not found.' });
    }

    const hospitalId = adminResult[0].hospital_id;

    // Get hospital bed statistics
    const [hospitalStats] = await pool.execute(
      'SELECT total_beds, available_beds, icu_beds, emergency_beds FROM hospitals WHERE id = ?',
      [hospitalId]
    );

    // Get active doctors count
    const [activeDoctors] = await pool.execute(
      `SELECT COUNT(*) as count FROM doctors d
       JOIN users u ON d.user_id = u.id
       WHERE d.hospital_id = ? AND u.is_active = TRUE AND d.is_available = TRUE`,
      [hospitalId]
    );

    // Get today's appointments count
    const [todayAppointments] = await pool.execute(
      'SELECT COUNT(*) as count FROM appointments WHERE hospital_id = ? AND appointment_date = CURDATE()',
      [hospitalId]
    );

    // Get total patients count (unique patients who had appointments)
    const [totalPatients] = await pool.execute(
      'SELECT COUNT(DISTINCT patient_id) as count FROM appointments WHERE hospital_id = ?',
      [hospitalId]
    );

    // Get blood bank summary
    const [bloodBankStats] = await pool.execute(
      'SELECT blood_type, units_available FROM blood_bank WHERE hospital_id = ? ORDER BY blood_type',
      [hospitalId]
    );

    res.json({
      bedStats: hospitalStats[0] || { total_beds: 0, available_beds: 0, icu_beds: 0, emergency_beds: 0 },
      activeDoctors: activeDoctors[0].count,
      todayAppointments: todayAppointments[0].count,
      totalPatients: totalPatients[0].count,
      bloodBankStats
    });
  } catch (error) {
    console.error('Get admin dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics.' });
  }
});

// Manage bed availability
router.put('/beds', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { totalBeds, availableBeds, icuBeds, emergencyBeds } = req.body;

    // Get admin's hospital ID
    const [adminResult] = await pool.execute(
      'SELECT hospital_id FROM admins WHERE user_id = ?',
      [req.user.id]
    );

    if (adminResult.length === 0) {
      return res.status(404).json({ error: 'Admin profile not found.' });
    }

    const hospitalId = adminResult[0].hospital_id;

    // Update hospital bed information
    await pool.execute(
      `UPDATE hospitals SET total_beds = ?, available_beds = ?, 
       icu_beds = ?, emergency_beds = ?, updated_at = NOW() WHERE id = ?`,
      [totalBeds, availableBeds, icuBeds, emergencyBeds, hospitalId]
    );

    res.json({ message: 'Bed availability updated successfully.' });
  } catch (error) {
    console.error('Update bed availability error:', error);
    res.status(500).json({ error: 'Failed to update bed availability.' });
  }
});

// Manage blood bank inventory
router.put('/blood-bank', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { bloodType, unitsAvailable } = req.body;

    if (!bloodType || unitsAvailable === undefined) {
      return res.status(400).json({ error: 'Blood type and units available are required.' });
    }

    // Get admin's hospital ID
    const [adminResult] = await pool.execute(
      'SELECT hospital_id FROM admins WHERE user_id = ?',
      [req.user.id]
    );

    if (adminResult.length === 0) {
      return res.status(404).json({ error: 'Admin profile not found.' });
    }

    const hospitalId = adminResult[0].hospital_id;

    // Update or insert blood bank record
    await pool.execute(
      `INSERT INTO blood_bank (hospital_id, blood_type, units_available) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE units_available = ?, last_updated = NOW()`,
      [hospitalId, bloodType, unitsAvailable, unitsAvailable]
    );

    res.json({ message: 'Blood bank inventory updated successfully.' });
  } catch (error) {
    console.error('Update blood bank error:', error);
    res.status(500).json({ error: 'Failed to update blood bank inventory.' });
  }
});

// Get hospital doctors
router.get('/doctors', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    // Get admin's hospital ID
    const [adminResult] = await pool.execute(
      'SELECT hospital_id FROM admins WHERE user_id = ?',
      [req.user.id]
    );

    if (adminResult.length === 0) {
      return res.status(404).json({ error: 'Admin profile not found.' });
    }

    const hospitalId = adminResult[0].hospital_id;

    // Get all doctors in the hospital
    const [doctors] = await pool.execute(
      `SELECT d.id, u.name, u.email, u.phone, d.license_no, d.specialization,
              d.experience_years, d.is_available, d.rating, d.total_patients,
              u.is_active
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       WHERE d.hospital_id = ?
       ORDER BY u.name`,
      [hospitalId]
    );

    res.json({ doctors });
  } catch (error) {
    console.error('Get hospital doctors error:', error);
    res.status(500).json({ error: 'Failed to fetch hospital doctors.' });
  }
});

// Update doctor status (active/inactive)
router.put('/doctors/:id/status', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { isActive } = req.body;
    const doctorId = req.params.id;

    // Get admin's hospital ID
    const [adminResult] = await pool.execute(
      'SELECT hospital_id FROM admins WHERE user_id = ?',
      [req.user.id]
    );

    if (adminResult.length === 0) {
      return res.status(404).json({ error: 'Admin profile not found.' });
    }

    const hospitalId = adminResult[0].hospital_id;

    // Verify doctor belongs to this hospital
    const [doctorCheck] = await pool.execute(
      'SELECT user_id FROM doctors WHERE id = ? AND hospital_id = ?',
      [doctorId, hospitalId]
    );

    if (doctorCheck.length === 0) {
      return res.status(403).json({ error: 'Unauthorized to update this doctor.' });
    }

    const userId = doctorCheck[0].user_id;

    // Update doctor status
    await pool.execute(
      'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [isActive, userId]
    );

    res.json({ message: 'Doctor status updated successfully.' });
  } catch (error) {
    console.error('Update doctor status error:', error);
    res.status(500).json({ error: 'Failed to update doctor status.' });
  }
});

// Get hospital patients
router.get('/patients', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get admin's hospital ID
    const [adminResult] = await pool.execute(
      'SELECT hospital_id FROM admins WHERE user_id = ?',
      [req.user.id]
    );

    if (adminResult.length === 0) {
      return res.status(404).json({ error: 'Admin profile not found.' });
    }

    const hospitalId = adminResult[0].hospital_id;

    // Get patients who had appointments at this hospital
    const [patients] = await pool.execute(
      `SELECT DISTINCT u.id, u.name, u.email, u.phone, u.date_of_birth, u.gender,
              COUNT(a.id) as total_appointments,
              MAX(a.appointment_date) as last_visit
       FROM users u
       JOIN appointments a ON u.id = a.patient_id
       WHERE a.hospital_id = ? AND u.role = 'patient'
       GROUP BY u.id
       ORDER BY last_visit DESC
       LIMIT ? OFFSET ?`,
      [hospitalId, parseInt(limit), parseInt(offset)]
    );

    res.json({ patients });
  } catch (error) {
    console.error('Get hospital patients error:', error);
    res.status(500).json({ error: 'Failed to fetch hospital patients.' });
  }
});

// Send notification to patients
router.post('/notifications/send', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { title, message, type = 'general', patientIds } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    // Get admin's hospital ID
    const [adminResult] = await pool.execute(
      'SELECT hospital_id FROM admins WHERE user_id = ?',
      [req.user.id]
    );

    if (adminResult.length === 0) {
      return res.status(404).json({ error: 'Admin profile not found.' });
    }

    const hospitalId = adminResult[0].hospital_id;

    let targetPatients = [];

    if (patientIds && patientIds.length > 0) {
      // Send to specific patients
      targetPatients = patientIds;
    } else {
      // Send to all patients who had appointments at this hospital
      const [allPatients] = await pool.execute(
        `SELECT DISTINCT patient_id
         FROM appointments
         WHERE hospital_id = ?`,
        [hospitalId]
      );
      targetPatients = allPatients.map(p => p.patient_id);
    }

    // Insert notifications for all target patients
    const notificationPromises = targetPatients.map(patientId =>
      pool.execute(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [patientId, title, message, type]
      )
    );

    await Promise.all(notificationPromises);

    res.json({ 
      message: 'Notifications sent successfully.',
      sentTo: targetPatients.length
    });
  } catch (error) {
    console.error('Send notifications error:', error);
    res.status(500).json({ error: 'Failed to send notifications.' });
  }
});

// Get hospital appointments
router.get('/appointments', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { status, date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Get admin's hospital ID
    const [adminResult] = await pool.execute(
      'SELECT hospital_id FROM admins WHERE user_id = ?',
      [req.user.id]
    );

    if (adminResult.length === 0) {
      return res.status(404).json({ error: 'Admin profile not found.' });
    }

    const hospitalId = adminResult[0].hospital_id;

    let query = `
      SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.type,
             u1.name as patient_name, u1.phone as patient_phone,
             u2.name as doctor_name, d.specialization
      FROM appointments a
      JOIN users u1 ON a.patient_id = u1.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u2 ON d.user_id = u2.id
      WHERE a.hospital_id = ?
    `;
    
    const params = [hospitalId];

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    if (date) {
      query += ' AND a.appointment_date = ?';
      params.push(date);
    }

    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [appointments] = await pool.execute(query, params);

    res.json({ appointments });
  } catch (error) {
    console.error('Get hospital appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch hospital appointments.' });
  }
});

module.exports = router;