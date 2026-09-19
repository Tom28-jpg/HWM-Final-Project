const express = require('express');
const pool = require('../config/database');
const { verifyToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Book appointment (Patient only)
router.post('/book', verifyToken, checkRole(['patient']), async (req, res) => {
  try {
    const { doctorId, appointmentDate, appointmentTime, type = 'consultation', symptoms } = req.body;

    if (!doctorId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: 'Doctor ID, appointment date, and time are required.' });
    }

    // Validate appointment date (must be in the future)
    const appointmentDateTime = new Date(`${appointmentDate} ${appointmentTime}`);
    if (appointmentDateTime <= new Date()) {
      return res.status(400).json({ error: 'Appointment must be scheduled for a future date and time.' });
    }

    // Get doctor and hospital information
    const [doctorResult] = await pool.execute(
      `SELECT d.id, d.hospital_id, d.is_available, u.name as doctor_name
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = ? AND u.is_active = TRUE`,
      [doctorId]
    );

    if (doctorResult.length === 0) {
      return res.status(404).json({ error: 'Doctor not found or not available.' });
    }

    const doctor = doctorResult[0];

    if (!doctor.is_available) {
      return res.status(400).json({ error: 'Doctor is currently not available for appointments.' });
    }

    // Check if the time slot is already booked
    const [existingAppointment] = await pool.execute(
      `SELECT id FROM appointments 
       WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? 
       AND status NOT IN ('cancelled', 'completed')`,
      [doctorId, appointmentDate, appointmentTime]
    );

    if (existingAppointment.length > 0) {
      return res.status(400).json({ error: 'This time slot is already booked.' });
    }

    // Create the appointment
    const [result] = await pool.execute(
      `INSERT INTO appointments (patient_id, doctor_id, hospital_id, appointment_date, 
       appointment_time, type, symptoms, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
      [req.user.id, doctorId, doctor.hospital_id, appointmentDate, appointmentTime, type, symptoms]
    );

    const appointmentId = result.insertId;

    // Create notification for patient
    await pool.execute(
      `INSERT INTO notifications (user_id, title, message, type) 
       VALUES (?, ?, ?, 'appointment')`,
      [
        req.user.id,
        'Appointment Scheduled',
        `Your appointment with Dr. ${doctor.doctor_name} has been scheduled for ${appointmentDate} at ${appointmentTime}.`
      ]
    );

    // Create notification for doctor
    const [doctorUser] = await pool.execute(
      'SELECT user_id FROM doctors WHERE id = ?',
      [doctorId]
    );

    if (doctorUser.length > 0) {
      await pool.execute(
        `INSERT INTO notifications (user_id, title, message, type) 
         VALUES (?, ?, ?, 'appointment')`,
        [
          doctorUser[0].user_id,
          'New Appointment Booked',
          `A new appointment has been booked with you for ${appointmentDate} at ${appointmentTime}.`
        ]
      );
    }

    res.status(201).json({
      message: 'Appointment booked successfully.',
      appointmentId,
      appointmentDate,
      appointmentTime,
      doctorName: doctor.doctor_name
    });
  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ error: 'Failed to book appointment.' });
  }
});

// Get available time slots for a doctor
router.get('/slots/:doctorId', verifyToken, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required.' });
    }

    // Validate date format and ensure it's in the future
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      return res.status(400).json({ error: 'Cannot book appointments for past dates.' });
    }

    // Get doctor's availability schedule
    const [doctorResult] = await pool.execute(
      `SELECT d.availability_schedule, u.name as doctor_name
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = ? AND d.is_available = TRUE AND u.is_active = TRUE`,
      [doctorId]
    );

    if (doctorResult.length === 0) {
      return res.status(404).json({ error: 'Doctor not found or not available.' });
    }

    const doctor = doctorResult[0];
    const dayOfWeek = appointmentDate.toLocaleLowerCase().substring(0, 3); // mon, tue, wed, etc.

    // Default availability if no schedule is set
    let availableSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
    ];

    // If doctor has custom schedule, use that
    if (doctor.availability_schedule) {
      try {
        const schedule = JSON.parse(doctor.availability_schedule);
        if (schedule[dayOfWeek]) {
          availableSlots = schedule[dayOfWeek];
        } else {
          availableSlots = []; // No availability for this day
        }
      } catch (e) {
        console.error('Error parsing availability schedule:', e);
      }
    }

    // Get already booked slots for this date
    const [bookedSlots] = await pool.execute(
      `SELECT appointment_time 
       FROM appointments 
       WHERE doctor_id = ? AND appointment_date = ? 
       AND status NOT IN ('cancelled', 'completed')`,
      [doctorId, date]
    );

    const bookedTimes = bookedSlots.map(slot => slot.appointment_time.substring(0, 5));

    // Filter out booked slots
    const availableTimeSlots = availableSlots.filter(time => !bookedTimes.includes(time));

    res.json({
      date,
      doctorName: doctor.doctor_name,
      availableSlots: availableTimeSlots
    });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ error: 'Failed to fetch available time slots.' });
  }
});

// Cancel appointment
router.put('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { reason } = req.body;

    // Get appointment details
    const [appointmentResult] = await pool.execute(
      `SELECT a.*, u1.name as patient_name, u2.name as doctor_name
       FROM appointments a
       JOIN users u1 ON a.patient_id = u1.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users u2 ON d.user_id = u2.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    if (appointmentResult.length === 0) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    const appointment = appointmentResult[0];

    // Check if user has permission to cancel this appointment
    const canCancel = req.user.role === 'patient' && appointment.patient_id === req.user.id ||
                     req.user.role === 'doctor' && appointment.doctor_id === req.user.id ||
                     req.user.role === 'admin';

    if (!canCancel) {
      return res.status(403).json({ error: 'Unauthorized to cancel this appointment.' });
    }

    // Check if appointment can be cancelled (not already completed/cancelled)
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({ error: `Cannot cancel an appointment that is already ${appointment.status}.` });
    }

    // Update appointment status
    await pool.execute(
      'UPDATE appointments SET status = "cancelled", notes = ?, updated_at = NOW() WHERE id = ?',
      [reason || 'Cancelled by user', appointmentId]
    );

    // Send notifications to both patient and doctor
    const notifications = [
      {
        userId: appointment.patient_id,
        title: 'Appointment Cancelled',
        message: `Your appointment with Dr. ${appointment.doctor_name} on ${appointment.appointment_date} at ${appointment.appointment_time} has been cancelled.`
      }
    ];

    // Get doctor's user ID
    const [doctorUser] = await pool.execute(
      'SELECT user_id FROM doctors WHERE id = ?',
      [appointment.doctor_id]
    );

    if (doctorUser.length > 0) {
      notifications.push({
        userId: doctorUser[0].user_id,
        title: 'Appointment Cancelled',
        message: `The appointment with ${appointment.patient_name} on ${appointment.appointment_date} at ${appointment.appointment_time} has been cancelled.`
      });
    }

    // Insert notifications
    const notificationPromises = notifications.map(notif =>
      pool.execute(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "appointment")',
        [notif.userId, notif.title, notif.message]
      )
    );

    await Promise.all(notificationPromises);

    res.json({ message: 'Appointment cancelled successfully.' });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment.' });
  }
});

// Reschedule appointment
router.put('/:id/reschedule', verifyToken, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { newDate, newTime } = req.body;

    if (!newDate || !newTime) {
      return res.status(400).json({ error: 'New date and time are required.' });
    }

    // Validate new appointment date (must be in the future)
    const newDateTime = new Date(`${newDate} ${newTime}`);
    if (newDateTime <= new Date()) {
      return res.status(400).json({ error: 'New appointment must be scheduled for a future date and time.' });
    }

    // Get appointment details
    const [appointmentResult] = await pool.execute(
      `SELECT a.*, u1.name as patient_name, u2.name as doctor_name
       FROM appointments a
       JOIN users u1 ON a.patient_id = u1.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users u2 ON d.user_id = u2.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    if (appointmentResult.length === 0) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    const appointment = appointmentResult[0];

    // Check if user has permission to reschedule this appointment
    const canReschedule = req.user.role === 'patient' && appointment.patient_id === req.user.id ||
                         req.user.role === 'doctor' && appointment.doctor_id === req.user.id;

    if (!canReschedule) {
      return res.status(403).json({ error: 'Unauthorized to reschedule this appointment.' });
    }

    // Check if appointment can be rescheduled
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({ error: `Cannot reschedule an appointment that is already ${appointment.status}.` });
    }

    // Check if the new time slot is available
    const [conflictingAppointment] = await pool.execute(
      `SELECT id FROM appointments 
       WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? 
       AND status NOT IN ('cancelled', 'completed') AND id != ?`,
      [appointment.doctor_id, newDate, newTime, appointmentId]
    );

    if (conflictingAppointment.length > 0) {
      return res.status(400).json({ error: 'The new time slot is already booked.' });
    }

    // Update appointment
    await pool.execute(
      `UPDATE appointments SET appointment_date = ?, appointment_time = ?, 
       status = 'scheduled', updated_at = NOW() WHERE id = ?`,
      [newDate, newTime, appointmentId]
    );

    // Send notifications
    const notifications = [
      {
        userId: appointment.patient_id,
        title: 'Appointment Rescheduled',
        message: `Your appointment with Dr. ${appointment.doctor_name} has been rescheduled to ${newDate} at ${newTime}.`
      }
    ];

    // Get doctor's user ID
    const [doctorUser] = await pool.execute(
      'SELECT user_id FROM doctors WHERE id = ?',
      [appointment.doctor_id]
    );

    if (doctorUser.length > 0) {
      notifications.push({
        userId: doctorUser[0].user_id,
        title: 'Appointment Rescheduled',
        message: `The appointment with ${appointment.patient_name} has been rescheduled to ${newDate} at ${newTime}.`
      });
    }

    // Insert notifications
    const notificationPromises = notifications.map(notif =>
      pool.execute(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "appointment")',
        [notif.userId, notif.title, notif.message]
      )
    );

    await Promise.all(notificationPromises);

    res.json({ 
      message: 'Appointment rescheduled successfully.',
      newDate,
      newTime
    });
  } catch (error) {
    console.error('Reschedule appointment error:', error);
    res.status(500).json({ error: 'Failed to reschedule appointment.' });
  }
});

// Get appointment details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const appointmentId = req.params.id;

    const [appointmentResult] = await pool.execute(
      `SELECT a.*, 
              u1.name as patient_name, u1.phone as patient_phone, u1.email as patient_email,
              u1.date_of_birth as patient_dob, u1.gender as patient_gender,
              u2.name as doctor_name, d.specialization, d.license_no,
              h.name as hospital_name, h.address as hospital_address, h.phone as hospital_phone
       FROM appointments a
       JOIN users u1 ON a.patient_id = u1.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users u2 ON d.user_id = u2.id
       JOIN hospitals h ON a.hospital_id = h.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    if (appointmentResult.length === 0) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    const appointment = appointmentResult[0];

    // Check if user has permission to view this appointment
    const canView = req.user.role === 'patient' && appointment.patient_id === req.user.id ||
                   req.user.role === 'doctor' && appointment.doctor_id === req.user.id ||
                   req.user.role === 'admin';

    if (!canView) {
      return res.status(403).json({ error: 'Unauthorized to view this appointment.' });
    }

    res.json({ appointment });
  } catch (error) {
    console.error('Get appointment details error:', error);
    res.status(500).json({ error: 'Failed to fetch appointment details.' });
  }
});

module.exports = router;

export default router