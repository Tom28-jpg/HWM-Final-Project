const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const pool = require('../config/database');
const { authLimiter } = require('../middleware/auth');

const router = express.Router();
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Email transporter
const emailTransporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via email
const sendEmailOTP = async (email, otp, name) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'WIZARDS Healthcare - Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">WIZARDS Healthcare</h2>
        <p>Hello ${name},</p>
        <p>Your verification code is:</p>
        <div style="background: #F3F4F6; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr>
        <p style="color: #6B7280; font-size: 12px;">WIZARDS Healthcare - Digital Health Services</p>
      </div>
    `
  };

  await emailTransporter.sendMail(mailOptions);
};

// Send OTP via SMS
const sendSMSOTP = async (phone, otp) => {
  await twilioClient.messages.create({
    body: `Your WIZARDS Healthcare verification code is: ${otp}. Valid for 10 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  });
};

// Store OTP in database
const storeOTP = async (userId, email, phone, otp, type) => {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  await pool.execute(
    'INSERT INTO otp_verifications (user_id, email, phone, otp_code, type, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, email, phone, otp, type, expiresAt]
  );
};

// Patient signup
router.post('/signup/patient', authLimiter, async (req, res) => {
  try {
    const { name, email, phone, password, dateOfBirth, gender, address } = req.body;

    // Validate input
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'All required fields must be provided.' });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR phone = ?',
      [email, phone]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User with this email or phone already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const [result] = await pool.execute(
      `INSERT INTO users (role, name, email, phone, password, date_of_birth, gender, address) 
       VALUES ('patient', ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone, hashedPassword, dateOfBirth, gender, address]
    );

    const userId = result.insertId;

    // Generate and send OTP
    const emailOTP = generateOTP();
    const smsOTP = generateOTP();

    await storeOTP(userId, email, phone, emailOTP, 'email');
    await storeOTP(userId, email, phone, smsOTP, 'sms');

    await sendEmailOTP(email, emailOTP, name);
    await sendSMSOTP(phone, smsOTP);

    res.status(201).json({
      message: 'Patient registered successfully. Please verify your email and phone.',
      userId,
      requiresVerification: true
    });
  } catch (error) {
    console.error('Patient signup error:', error);
    res.status(500).json({ error: 'Failed to register patient.' });
  }
});

// Doctor signup
router.post('/signup/doctor', authLimiter, async (req, res) => {
  try {
    const { 
      name, email, phone, password, licenseId, hospitalId, 
      specialization, experienceYears, consultationFee 
    } = req.body;

    // Validate input
    if (!name || !email || !phone || !password || !licenseId || !hospitalId) {
      return res.status(400).json({ error: 'All required fields must be provided.' });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR phone = ?',
      [email, phone]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User with this email or phone already exists.' });
    }

    // Check if license already exists
    const [existingDoctors] = await pool.execute(
      'SELECT id FROM doctors WHERE license_no = ?',
      [licenseId]
    );

    if (existingDoctors.length > 0) {
      return res.status(400).json({ error: 'Doctor with this license number already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create user
      const [userResult] = await connection.execute(
        `INSERT INTO users (role, name, email, phone, password) 
         VALUES ('doctor', ?, ?, ?, ?)`,
        [name, email, phone, hashedPassword]
      );

      const userId = userResult.insertId;

      // Create doctor profile
      await connection.execute(
        `INSERT INTO doctors (user_id, hospital_id, license_no, specialization, experience_years, consultation_fee) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, hospitalId, licenseId, specialization, experienceYears || 0, consultationFee || 0]
      );

      await connection.commit();

      // Generate and send OTP
      const emailOTP = generateOTP();
      const smsOTP = generateOTP();

      await storeOTP(userId, email, phone, emailOTP, 'email');
      await storeOTP(userId, email, phone, smsOTP, 'sms');

      await sendEmailOTP(email, emailOTP, name);
      await sendSMSOTP(phone, smsOTP);

      res.status(201).json({
        message: 'Doctor registered successfully. Please verify your email and phone.',
        userId,
        requiresVerification: true
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Doctor signup error:', error);
    res.status(500).json({ error: 'Failed to register doctor.' });
  }
});

// Admin signup
router.post('/signup/admin', authLimiter, async (req, res) => {
  try {
    const { name, email, phone, password, hospitalLicense, position } = req.body;

    // Validate input
    if (!name || !email || !phone || !password || !hospitalLicense) {
      return res.status(400).json({ error: 'All required fields must be provided.' });
    }

    // Find hospital by license
    const [hospitals] = await pool.execute(
      'SELECT id FROM hospitals WHERE license_no = ?',
      [hospitalLicense]
    );

    if (hospitals.length === 0) {
      return res.status(400).json({ error: 'Invalid hospital license number.' });
    }

    const hospitalId = hospitals[0].id;

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR phone = ?',
      [email, phone]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User with this email or phone already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create user
      const [userResult] = await connection.execute(
        `INSERT INTO users (role, name, email, phone, password) 
         VALUES ('admin', ?, ?, ?, ?)`,
        [name, email, phone, hashedPassword]
      );

      const userId = userResult.insertId;

      // Create admin profile
      await connection.execute(
        `INSERT INTO admins (user_id, hospital_id, position, permissions) 
         VALUES (?, ?, ?, ?)`,
        [userId, hospitalId, position, JSON.stringify(['manage_beds', 'manage_blood', 'manage_doctors', 'send_notifications'])]
      );

      await connection.commit();

      // Generate and send OTP
      const emailOTP = generateOTP();
      const smsOTP = generateOTP();

      await storeOTP(userId, email, phone, emailOTP, 'email');
      await storeOTP(userId, email, phone, smsOTP, 'sms');

      await sendEmailOTP(email, emailOTP, name);
      await sendSMSOTP(phone, smsOTP);

      res.status(201).json({
        message: 'Admin registered successfully. Please verify your email and phone.',
        userId,
        requiresVerification: true
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Admin signup error:', error);
    res.status(500).json({ error: 'Failed to register admin.' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, emailOTP, smsOTP } = req.body;

    if (!userId || !emailOTP || !smsOTP) {
      return res.status(400).json({ error: 'User ID and both OTP codes are required.' });
    }

    // Verify both OTPs
    const [emailVerification] = await pool.execute(
      'SELECT * FROM otp_verifications WHERE user_id = ? AND otp_code = ? AND type = "email" AND expires_at > NOW() AND is_used = FALSE',
      [userId, emailOTP]
    );

    const [smsVerification] = await pool.execute(
      'SELECT * FROM otp_verifications WHERE user_id = ? AND otp_code = ? AND type = "sms" AND expires_at > NOW() AND is_used = FALSE',
      [userId, smsOTP]
    );

    if (emailVerification.length === 0 || smsVerification.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP codes.' });
    }

    // Mark OTPs as used and verify user
    await pool.execute(
      'UPDATE otp_verifications SET is_used = TRUE WHERE user_id = ? AND (type = "email" OR type = "sms")',
      [userId]
    );

    await pool.execute(
      'UPDATE users SET is_verified = TRUE WHERE id = ?',
      [userId]
    );

    res.json({ message: 'Account verified successfully. You can now login.' });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Failed to verify OTP.' });
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required.' });
    }

    // Find user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND role = ?',
      [email, role]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const user = users[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Check if user is verified
    if (!user.is_verified) {
      return res.status(400).json({ 
        error: 'Account not verified. Please complete the verification process.',
        requiresVerification: true,
        userId: user.id
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(400).json({ error: 'Account is suspended. Please contact support.' });
    }

    // Generate login OTP
    const loginOTP = generateOTP();
    await storeOTP(user.id, user.email, user.phone, loginOTP, 'login');
    
    await sendSMSOTP(user.phone, loginOTP);

    res.json({
      message: 'Login OTP sent to your registered phone number.',
      userId: user.id,
      requiresLoginOTP: true
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// Verify login OTP
router.post('/verify-login-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ error: 'User ID and OTP are required.' });
    }

    // Verify OTP
    const [verification] = await pool.execute(
      'SELECT * FROM otp_verifications WHERE user_id = ? AND otp_code = ? AND type = "login" AND expires_at > NOW() AND is_used = FALSE',
      [userId, otp]
    );

    if (verification.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    // Mark OTP as used
    await pool.execute(
      'UPDATE otp_verifications SET is_used = TRUE WHERE id = ?',
      [verification[0].id]
    );

    // Get user details with additional info based on role
    let userQuery = `
      SELECT u.id, u.role, u.name, u.email, u.phone, u.gender, u.date_of_birth, 
             u.address, u.location, u.language_preference
      FROM users u WHERE u.id = ?
    `;
    
    const [userResult] = await pool.execute(userQuery, [userId]);
    const user = userResult[0];

    // Get role-specific information
    let additionalInfo = {};
    
    if (user.role === 'doctor') {
      const [doctorInfo] = await pool.execute(
        `SELECT d.license_no, d.specialization, d.experience_years, d.consultation_fee, 
                d.is_available, d.rating, h.name as hospital_name, h.id as hospital_id
         FROM doctors d 
         LEFT JOIN hospitals h ON d.hospital_id = h.id 
         WHERE d.user_id = ?`,
        [userId]
      );
      additionalInfo = doctorInfo[0] || {};
    } else if (user.role === 'admin') {
      const [adminInfo] = await pool.execute(
        `SELECT a.position, a.permissions, h.name as hospital_name, h.id as hospital_id, h.license_no
         FROM admins a 
         LEFT JOIN hospitals h ON a.hospital_id = h.id 
         WHERE a.user_id = ?`,
        [userId]
      );
      additionalInfo = adminInfo[0] || {};
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        ...user,
        ...additionalInfo
      }
    });
  } catch (error) {
    console.error('Login OTP verification error:', error);
    res.status(500).json({ error: 'Login verification failed.' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId, type } = req.body; // type: 'email', 'sms', 'login'

    if (!userId || !type) {
      return res.status(400).json({ error: 'User ID and OTP type are required.' });
    }

    // Get user details
    const [users] = await pool.execute(
      'SELECT name, email, phone FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'User not found.' });
    }

    const user = users[0];
    const otp = generateOTP();

    // Store new OTP
    await storeOTP(userId, user.email, user.phone, otp, type);

    // Send OTP based on type
    if (type === 'email') {
      await sendEmailOTP(user.email, otp, user.name);
    } else {
      await sendSMSOTP(user.phone, otp);
    }

    res.json({ message: `New OTP sent successfully via ${type}.` });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend OTP.' });
  }
});

module.exports = router;

export default storeOTP