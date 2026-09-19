const express = require('express');
const pool = require('../config/database');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get doctor profile
router.get('/profile', verifyToken, checkRole(['doctor']), async (req, res) => {
  try {
    const [result] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.phone, u.gender, u.address, u.location,
              d.license_no, d.specialization, d.experience_years, d.consultation_fee,
              d.is_available, d.availability_schedule, d.rating, d.total_patients,
              h.id as hospital_id, h.name as hospital_name, h.address as hospital_address
       FROM users u
       JOIN doctors d ON u.id = d.user_id
       JOIN hospitals h ON d.hospital_id = h.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    const doctor = result[0];
    if (doctor.availability_schedule) {
      doctor.availability_schedule = JSON.parse(doctor.availability_schedule);
    }

    res.json({ doctor });
  } catch (error) {
    console.error('Get doctor profile error:', error);
    res.status(500).json({ error: 'Failed to fetch doctor profile.' });
  }
});

// Update doctor profile
router.put('/profile', verifyToken, checkRole(['doctor']), async (req, res) => {
  try {
    const { 
      name, phone, address, consultationFee, availabilitySchedule, specialization 
    } = req.body;

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update user table
      await connection.execute(
        'UPDATE users SET name = ?, phone = ?, address = ?, updated_at = NOW() WHERE id = ?',
        [name, phone, address, req.user.id]
      );

      // Update doctor table
      await connection.execute(
        `UPDATE doctors SET consultation_fee = ?, availability_schedule = ?, 
         specialization = ?, updated_at = NOW() WHERE user_id = ?`,
        [consultationFee, JSON.stringify(availabilitySchedule), specialization, req.user.id]
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
    console.error('Update doctor profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Toggle availability
router.put('/availability', verifyToken, checkRole(['doctor']), async (req, res) => {
  try {
    const { isAvailable } = req.body;

    await pool.execute(
      'UPDATE doctors SET is_available = ?, updated_at = NOW() WHERE user_id = ?',
      [isAvailable, req.user.id]
    );

    res.json({ message: 'Availability updated successfully.' });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ error: 'Failed to update availability.' });
  }
});

// Get doctor's appointments
router.get('/appointments', verifyToken, checkRole(['doctor']), async (req, res) => {
  try {
    const { status, date, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get doctor ID
    const [doctorResult] = await pool.execute(
      'SELECT id FROM doctors WHERE user_id = ?',
      [req.user.id]
    );

    if (doctorResult.length === 0) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    const doctorId = doctorResult[0].id;

    let query = `
      SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.type, 
             a.symptoms, a.notes, a.prescription,
             u.id as patient_id, u.name as patient_name, u.phone as patient_phone,
             u.date_of_birth as patient_dob, u.gender as patient_gender
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      WHERE a.doctor_id = ?
    `;
    
    const params = [doctorId];

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
    console.error('Get doctor appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
});

// Update appointment
router.put('/appointments/:id', verifyToken, checkRole(['doctor']), async (req, res) => {
  try {
    const { status, notes, prescription } = req.body;
    const appointmentId = req.params.id;

    // Get doctor ID
    const [doctorResult] = await pool.execute(
      'SELECT id FROM doctors WHERE user_id = ?',
      [req.user.id]
    );

    if (doctorResult.length === 0) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    const doctorId = doctorResult[0].id;

    // Verify appointment belongs to this doctor
    const [appointmentCheck] = await pool.execute(
      'SELECT id FROM appointments WHERE id = ? AND doctor_id = ?',
      [appointmentId, doctorId]
    );

    if (appointmentCheck.length === 0) {
      return res.status(403).json({ error: 'Unauthorized to update this appointment.' });
    }

    // Update appointment
    await pool.execute(
      `UPDATE appointments SET status = ?, notes = ?, prescription = ?, 
       updated_at = NOW() WHERE id = ?`,
      [status, notes, prescription, appointmentId]
    );

    res.json({ message: 'Appointment updated successfully.' });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Failed to update appointment.' });
  }
});

// Search patients
router.get('/patients/search', verifyToken, checkRole(['doctor']), async (req, res) => {
  try {
    const { patientId, name, phone } = req.query;

    if (!patientId && !name && !phone) {
      return res.status(400).json({ error: 'At least one search parameter is required.' });
    }

    let query = `
      SELECT u.id, u.name, u.email, u.phone, u.date_of_birth, u.gender, u.address,
             COUNT(a.id) as total_appointments,
             MAX(a.appointment_date) as last_appointment_date
      FROM users u
      LEFT JOIN appointments a ON u.id = a.patient_id
      WHERE u.role = 'patient' AND u.is_active = TRUE
    `;
    
    const params = [];

    if (patientId) {
      query += ' AND u.id = ?';
      params.push(patientId);
    }

    if (name) {
      query += ' AND u.name LIKE ?';
      params.push(`%${name}%`);
    }

    if (phone) {
      query += ' AND u.phone LIKE ?';
      params.push(`%${phone}%`);
    }

    query += ' GROUP BY u.id ORDER BY u.name LIMIT 20';

    const [patients] = await pool.execute(query, params);

    res.json({ patients });
  } catch (error) {
    console.error('Search patients error:', error);
    res.status(500).json({ error: 'Failed to search patients.' });
  }
});

// Get patient details and history
router.get('/patients/:id', verifyToken, checkRole(['doctor']), async (req, res) => {
  try {
    const patientId = req.params.id;

    // Get patient basic info
    const [patientResult] = await pool.execute(
      `SELECT id, name, email, phone, date_of_birth, gender, address, created_at
       FROM users WHERE id = ? AND role = 'patient'`,
      [patientId]
    );

    if (patientResult.length === 0) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    const patient = patientResult[0];

    // Get patient's appointment history
    const [appointments] = await pool.execute(
      `SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.type,
              a.symptoms, a.notes, a.prescription,
              u.name as doctor_name, d.specialization
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC, a.appointment_time DESC
       LIMIT 10`,
      [patientId]
    );

    // Get patient's symptom logs
    const [symptomLogs] = await pool.execute(
      `SELECT id, symptoms, ai_analysis, severity, recommended_action, created_at
       FROM symptom_logs
       WHERE patient_id = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [patientId]
    );

    res.json({
      patient,
      appointments,
      symptomLogs: symptomLogs.map(log => ({
        ...log,
        ai_analysis: log.ai_analysis ? JSON.parse(log.ai_analysis) : null
      }))
    });
  } catch (error) {
    console.error('Get patient details error:', error);
    res.status(500).json({ error: 'Failed to fetch patient details.' });
  }
});

// Get hospital information for doctor
router.get('/hospital', verifyToken, checkRole(['doctor']), async (req, res) => {
  try {
    // Get doctor's hospital ID
    const [doctorResult] = await pool.execute(
      'SELECT hospital_id FROM doctors WHERE user_id = ?',
      [req.user.id]
    );

    if (doctorResult.length === 0) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    const hospitalId = doctorResult[0].hospital_id;

    // Get hospital details
    const [hospitalResult] = await pool.execute(
      `SELECT id, name, address, phone, email, dean_name, total_beds, 
              available_beds, icu_beds, emergency_beds
       FROM hospitals WHERE id = ?`,
      [hospitalId]
    );

    if (hospitalResult.length === 0) {
      return res.status(404).json({ error: 'Hospital not found.' });
    }

    const hospital = hospitalResult[0];

    // Get blood bank status
    const [bloodBank] = await pool.execute(
      'SELECT blood_type, units_available, last_updated FROM blood_bank WHERE hospital_id = ?',
      [hospitalId]
    );

    // Get staff information
    const [staff] = await pool.execute(
      `SELECT u.name, d.specialization, 'doctor' as role, d.is_available as present
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       WHERE d.hospital_id = ? AND u.is_active = TRUE
       ORDER BY u.name`,
      [hospitalId]
    );

    res.json({
      hospital,
      bloodBank,
      staff
    });
  } catch (error) {
    console.error('Get hospital information error:', error);
    res.status(500).json({ error: 'Failed to fetch hospital information.' });
  }
});

// Get dashboard statistics
router.get('/dashboard/stats', verifyToken, checkRole(['doctor']), async (req, res) => {
  try {
    // Get doctor ID
    const [doctorResult] = await pool.execute(
      'SELECT id FROM doctors WHERE user_id = ?',
      [req.user.id]
    );

    if (doctorResult.length === 0) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    const doctorId = doctorResult[0].id;

    // Get today's appointments count
    const [todayAppointments] = await pool.execute(
      'SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND appointment_date = CURDATE()',
      [doctorId]
    );

    // Get total patients count
    const [totalPatients] = await pool.execute(
      'SELECT COUNT(DISTINCT patient_id) as count FROM appointments WHERE doctor_id = ?',
      [doctorId]
    );

    // Get pending reviews count
    const [pendingReviews] = await pool.execute(
      'SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND status = "completed" AND prescription IS NULL',
      [doctorId]
    );

    // Get today's schedule
    const [todaySchedule] = await pool.execute(
      `SELECT a.appointment_time, a.status, a.type,
              u.name as patient_name
       FROM appointments a
       JOIN users u ON a.patient_id = u.id
       WHERE a.doctor_id = ? AND a.appointment_date = CURDATE()
       ORDER BY a.appointment_time`,
      [doctorId]
    );

    res.json({
      todayAppointments: todayAppointments[0].count,
      totalPatients: totalPatients[0].count,
      pendingReviews: pendingReviews[0].count,
      todaySchedule
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics.' });
  }
});

module.exports = router;

export default router