const express = require('express');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Search hospitals
router.get('/search', verifyToken, async (req, res) => {
  try {
    const { location, services, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT h.id, h.name, h.address, h.phone, h.email, h.dean_name,
             h.total_beds, h.available_beds, h.icu_beds, h.emergency_beds,
             h.location
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

    // Get additional information for each hospital
    for (let hospital of hospitals) {
      // Get blood bank availability
      const [bloodBank] = await pool.execute(
        'SELECT blood_type, units_available FROM blood_bank WHERE hospital_id = ? AND units_available > 0',
        [hospital.id]
      );

      // Get available specializations
      const [specializations] = await pool.execute(
        `SELECT DISTINCT d.specialization
         FROM doctors d
         JOIN users u ON d.user_id = u.id
         WHERE d.hospital_id = ? AND u.is_active = TRUE AND d.is_available = TRUE`,
        [hospital.id]
      );

      hospital.bloodAvailability = bloodBank;
      hospital.specializations = specializations.map(s => s.specialization);
      hospital.bedAvailability = {
        total: hospital.total_beds,
        available: hospital.available_beds,
        icu: hospital.icu_beds,
        emergency: hospital.emergency_beds
      };

      // Parse location if available
      if (hospital.location) {
        try {
          hospital.location = JSON.parse(hospital.location);
        } catch (e) {
          hospital.location = null;
        }
      }
    }

    res.json({ hospitals });
  } catch (error) {
    console.error('Search hospitals error:', error);
    res.status(500).json({ error: 'Failed to search hospitals.' });
  }
});

// Get hospital details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const hospitalId = req.params.id;

    // Get hospital basic information
    const [hospitalResult] = await pool.execute(
      `SELECT h.id, h.name, h.license_no, h.address, h.phone, h.email, h.dean_name,
              h.total_beds, h.available_beds, h.icu_beds, h.emergency_beds, h.location
       FROM hospitals h
       WHERE h.id = ? AND h.is_active = TRUE`,
      [hospitalId]
    );

    if (hospitalResult.length === 0) {
      return res.status(404).json({ error: 'Hospital not found.' });
    }

    const hospital = hospitalResult[0];

    // Parse location if available
    if (hospital.location) {
      try {
        hospital.location = JSON.parse(hospital.location);
      } catch (e) {
        hospital.location = null;
      }
    }

    // Get doctors
    const [doctors] = await pool.execute(
      `SELECT d.id, u.name, d.specialization, d.experience_years, d.consultation_fee,
              d.is_available, d.rating
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       WHERE d.hospital_id = ? AND u.is_active = TRUE
       ORDER BY d.rating DESC, u.name`,
      [hospitalId]
    );

    // Get blood bank status
    const [bloodBank] = await pool.execute(
      'SELECT blood_type, units_available, last_updated FROM blood_bank WHERE hospital_id = ? ORDER BY blood_type',
      [hospitalId]
    );

    // Get services/departments (based on doctor specializations)
    const [services] = await pool.execute(
      `SELECT DISTINCT d.specialization as service, COUNT(*) as doctor_count
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       WHERE d.hospital_id = ? AND u.is_active = TRUE
       GROUP BY d.specialization
       ORDER BY d.specialization`,
      [hospitalId]
    );

    res.json({
      hospital,
      doctors,
      bloodBank,
      services,
      bedAvailability: {
        total: hospital.total_beds,
        available: hospital.available_beds,
        icu: hospital.icu_beds,
        emergency: hospital.emergency_beds
      }
    });
  } catch (error) {
    console.error('Get hospital details error:', error);
    res.status(500).json({ error: 'Failed to fetch hospital details.' });
  }
});

// Get nearby hospitals
router.post('/nearby', verifyToken, async (req, res) => {
  try {
    const { latitude, longitude, radius = 50, limit = 10 } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    // Find hospitals within the specified radius (in kilometers)
    const [hospitals] = await pool.execute(
      `SELECT h.id, h.name, h.address, h.phone, h.total_beds, h.available_beds,
              h.icu_beds, h.emergency_beds, h.location,
              (6371 * acos(cos(radians(?)) * cos(radians(JSON_EXTRACT(h.location, '$.latitude'))) * 
               cos(radians(JSON_EXTRACT(h.location, '$.longitude')) - radians(?)) + 
               sin(radians(?)) * sin(radians(JSON_EXTRACT(h.location, '$.latitude'))))) AS distance
       FROM hospitals h
       WHERE h.is_active = TRUE AND h.location IS NOT NULL
       HAVING distance <= ?
       ORDER BY distance
       LIMIT ?`,
      [latitude, longitude, latitude, radius, parseInt(limit)]
    );

    // Parse location and add additional info for each hospital
    for (let hospital of hospitals) {
      if (hospital.location) {
        try {
          hospital.location = JSON.parse(hospital.location);
        } catch (e) {
          hospital.location = null;
        }
      }

      // Get available specializations
      const [specializations] = await pool.execute(
        `SELECT DISTINCT d.specialization
         FROM doctors d
         JOIN users u ON d.user_id = u.id
         WHERE d.hospital_id = ? AND u.is_active = TRUE AND d.is_available = TRUE`,
        [hospital.id]
      );

      hospital.specializations = specializations.map(s => s.specialization);
      hospital.distance = parseFloat(hospital.distance).toFixed(2);
    }

    res.json({ hospitals });
  } catch (error) {
    console.error('Get nearby hospitals error:', error);
    res.status(500).json({ error: 'Failed to find nearby hospitals.' });
  }
});

// Get hospital bed availability
router.get('/:id/beds', verifyToken, async (req, res) => {
  try {
    const hospitalId = req.params.id;

    const [bedInfo] = await pool.execute(
      `SELECT total_beds, available_beds, icu_beds, emergency_beds, updated_at
       FROM hospitals
       WHERE id = ? AND is_active = TRUE`,
      [hospitalId]
    );

    if (bedInfo.length === 0) {
      return res.status(404).json({ error: 'Hospital not found.' });
    }

    res.json({ bedAvailability: bedInfo[0] });
  } catch (error) {
    console.error('Get bed availability error:', error);
    res.status(500).json({ error: 'Failed to fetch bed availability.' });
  }
});

// Get hospital blood bank status
router.get('/:id/blood-bank', verifyToken, async (req, res) => {
  try {
    const hospitalId = req.params.id;

    const [bloodBank] = await pool.execute(
      'SELECT blood_type, units_available, last_updated FROM blood_bank WHERE hospital_id = ? ORDER BY blood_type',
      [hospitalId]
    );

    res.json({ bloodBank });
  } catch (error) {
    console.error('Get blood bank status error:', error);
    res.status(500).json({ error: 'Failed to fetch blood bank status.' });
  }
});

// Search blood availability across hospitals
router.get('/blood/search', verifyToken, async (req, res) => {
  try {
    const { bloodType, location, latitude, longitude } = req.query;

    if (!bloodType) {
      return res.status(400).json({ error: 'Blood type is required.' });
    }

    let query = `
      SELECT h.id, h.name, h.address, h.phone, h.location,
             bb.blood_type, bb.units_available, bb.last_updated
      FROM blood_bank bb
      JOIN hospitals h ON bb.hospital_id = h.id
      WHERE bb.blood_type = ? AND bb.units_available > 0 AND h.is_active = TRUE
    `;
    
    const params = [bloodType];

    if (location) {
      query += ' AND h.address LIKE ?';
      params.push(`%${location}%`);
    }

    // If coordinates provided, calculate distance
    if (latitude && longitude) {
      query = `
        SELECT h.id, h.name, h.address, h.phone, h.location,
               bb.blood_type, bb.units_available, bb.last_updated,
               (6371 * acos(cos(radians(?)) * cos(radians(JSON_EXTRACT(h.location, '$.latitude'))) * 
                cos(radians(JSON_EXTRACT(h.location, '$.longitude')) - radians(?)) + 
                sin(radians(?)) * sin(radians(JSON_EXTRACT(h.location, '$.latitude'))))) AS distance
        FROM blood_bank bb
        JOIN hospitals h ON bb.hospital_id = h.id
        WHERE bb.blood_type = ? AND bb.units_available > 0 AND h.is_active = TRUE 
        AND h.location IS NOT NULL
        ORDER BY distance
      `;
      params.unshift(latitude, longitude, latitude);
    } else {
      query += ' ORDER BY bb.units_available DESC';
    }

    const [bloodBanks] = await pool.execute(query, params);

    // Parse location data
    for (let bank of bloodBanks) {
      if (bank.location) {
        try {
          bank.location = JSON.parse(bank.location);
        } catch (e) {
          bank.location = null;
        }
      }
      if (bank.distance) {
        bank.distance = parseFloat(bank.distance).toFixed(2);
      }
    }

    res.json({ bloodBanks });
  } catch (error) {
    console.error('Search blood availability error:', error);
    res.status(500).json({ error: 'Failed to search blood availability.' });
  }
});

module.exports = router;

export default router