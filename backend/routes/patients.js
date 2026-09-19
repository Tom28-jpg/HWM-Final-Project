const express = require('express');
const axios = require('axios');
const pool = require('../config/database');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get patient profile
router.get('/profile', verifyToken, checkRole(['patient']), async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, phone, date_of_birth, gender, address, location, language_preference FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    res.json({ patient: users[0] });
  } catch (error) {
    console.error('Get patient profile error:', error);
    res.status(500).json({ error: 'Failed to fetch patient profile.' });
  }
});

// Update patient profile
router.put('/profile', verifyToken, checkRole(['patient']), async (req, res) => {
  try {
    const { name, phone, dateOfBirth, gender, address, languagePreference } = req.body;

    await pool.execute(
      `UPDATE users SET name = ?, phone = ?, date_of_birth = ?, gender = ?, 
       address = ?, language_preference = ?, updated_at = NOW() WHERE id = ?`,
      [name, phone, dateOfBirth, gender, address, languagePreference, req.user.id]
    );

    res.json({ message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Update patient profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// AI Symptom Checker
router.post('/symptoms/check', verifyToken, checkRole(['patient']), async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || symptoms.trim().length === 0) {
      return res.status(400).json({ error: 'Symptoms are required.' });
    }

    // Mock AI analysis (replace with actual AI API call)
    const mockAnalysis = {
      symptoms: symptoms,
      possibleConditions: [
        { name: 'Common Cold', probability: 0.75, description: 'Viral infection of upper respiratory tract' },
        { name: 'Seasonal Allergies', probability: 0.60, description: 'Allergic reaction to environmental factors' },
        { name: 'Viral Infection', probability: 0.45, description: 'General viral infection' }
      ],
      severity: symptoms.toLowerCase().includes('severe') || symptoms.toLowerCase().includes('pain') ? 'medium' : 'low',
      recommendations: [
        'Get plenty of rest and stay hydrated',
        'Take over-the-counter pain relievers if needed',
        'Monitor symptoms and seek medical attention if they worsen',
        'Consider consulting a doctor if symptoms persist for more than 3 days'
      ],
      urgency: symptoms.toLowerCase().includes('chest pain') || symptoms.toLowerCase().includes('breathing') ? 'high' : 'low',
      disclaimer: 'This is an AI-generated analysis and should not replace professional medical advice.'
    };

    // In production, call actual AI API:
    // const aiResponse = await axios.post(process.env.AI_API_URL, {
    //   symptoms: symptoms,
    //   headers: { 'Authorization': `Bearer ${process.env.AI_API_KEY}` }
    // });
    // const analysis = aiResponse.data;

    // Store symptom log
    await pool.execute(
      'INSERT INTO symptom_logs (patient_id, symptoms, ai_analysis, severity, recommended_action) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, symptoms, JSON.stringify(mockAnalysis), mockAnalysis.severity, mockAnalysis.recommendations.join('; ')]
    );

    res.json({ analysis: mockAnalysis });
  } catch (error) {
    console.error('Symptom check error:', error);
    res.status(500).json({ error: 'Failed to analyze symptoms.' });
  }
});

// Search doctors
router.get('/doctors/search', verifyToken, checkRole(['patient']), async (req, res) => {
  try {
    const { specialization, location, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT d.id, u.name, d.specialization, d.experience_years, d.consultation_fee, 
             d.is_available, d.rating, h.name as hospital_name, h.address as hospital_address
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      JOIN hospitals h ON d.hospital_id = h.id
      WHERE u.is_active = TRUE AND d.is_available = TRUE
    `;
    
    const params = [];

    if (specialization) {
      query += ' AND d.specialization = ?';
      params.push(specialization);
    }

    if (location) {
      // In production, implement proper location-based search using coordinates
      query += ' AND h.address LIKE ?';
      params.push(`%${location}%`);
    }

    query += ' ORDER BY d.rating DESC, d.experience_years DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [doctors] = await pool.execute(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      JOIN hospitals h ON d.hospital_id = h.id
      WHERE u.is_active = TRUE AND d.is_available = TRUE
    `;
    
    const countParams = [];
    if (specialization) {
      countQuery += ' AND d.specialization = ?';
      countParams.push(specialization);
    }
    if (location) {
      countQuery += ' AND h.address LIKE ?';
      countParams.push(`%${location}%`);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      doctors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Search doctors error:', error);
    res.status(500).json({ error: 'Failed to search doctors.' });
  }
});

// Search hospitals
router.get('/hospitals/search', verifyToken, checkRole(['patient']), async (req, res) => {
  try {
    const { location, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT h.id, h.name, h.address, h.phone, h.email, h.total_beds, 
             h.available_beds, h.icu_beds, h.emergency_beds
      FROM hospitals h
      WHERE h.is_active = TRUE
    `;
    
    const params = [];

    if (location) {
      query += ' AND h.address LIKE ?';
      params.push(`%${location}%`);
    }

    query += ' ORDER BY h.available_beds DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [hospitals] = await pool.execute(query, params);

    // Get bed availability for each hospital
    for (let hospital of hospitals) {
      hospital.bedAvailability = {
        general: hospital.available_beds,
        icu: hospital.icu_beds,
        emergency: hospital.emergency_beds
      };
    }

    res.json({ hospitals });
  } catch (error) {
    console.error('Search hospitals error:', error);
    res.status(500).json({ error: 'Failed to search hospitals.' });
  }
});

// Search blood banks
router.get('/blood/search', verifyToken, checkRole(['patient']), async (req, res) => {
  try {
    const { bloodType, location } = req.query;

    if (!bloodType) {
      return res.status(400).json({ error: 'Blood type is required.' });
    }

    let query = `
      SELECT h.id, h.name, h.address, h.phone, bb.blood_type, bb.units_available, bb.last_updated
      FROM blood_bank bb
      JOIN hospitals h ON bb.hospital_id = h.id
      WHERE bb.blood_type = ? AND bb.units_available > 0 AND h.is_active = TRUE
    `;
    
    const params = [bloodType];

    if (location) {
      query += ' AND h.address LIKE ?';
      params.push(`%${location}%`);
    }

    query += ' ORDER BY bb.units_available DESC';

    const [bloodBanks] = await pool.execute(query, params);

    res.json({ bloodBanks });
  } catch (error) {
    console.error('Search blood banks error:', error);
    res.status(500).json({ error: 'Failed to search blood banks.' });
  }
});

// Get patient appointments
router.get('/appointments', verifyToken, checkRole(['patient']), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.type, a.symptoms, a.notes,
             d.id as doctor_id, u.name as doctor_name, d.specialization,
             h.name as hospital_name, h.address as hospital_address
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      JOIN hospitals h ON a.hospital_id = h.id
      WHERE a.patient_id = ?
    `;
    
    const params = [req.user.id];

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [appointments] = await pool.execute(query, params);

    res.json({ appointments });
  } catch (error) {
    console.error('Get patient appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
});

// Get patient notifications
router.get('/notifications', verifyToken, checkRole(['patient']), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [notifications] = await pool.execute(
      `SELECT id, title, message, type, is_read, scheduled_for, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), parseInt(offset)]
    );

    res.json({ notifications });
  } catch (error) {
    console.error('Get patient notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', verifyToken, checkRole(['patient']), async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

module.exports = router;