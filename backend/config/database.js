const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wizards_healthcare',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
};

const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// Initialize database tables
async function initializeTables() {
  try {
    const connection = await pool.getConnection();
    
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        role ENUM('patient', 'doctor', 'admin') NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        date_of_birth DATE,
        gender ENUM('male', 'female', 'other'),
        address TEXT,
        location JSON,
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        language_preference ENUM('en', 'ta', 'hi') DEFAULT 'en',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Hospitals table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS hospitals (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(100) NOT NULL,
        license_no VARCHAR(50) UNIQUE NOT NULL,
        address TEXT NOT NULL,
        location JSON,
        phone VARCHAR(20),
        email VARCHAR(100),
        dean_name VARCHAR(100),
        total_beds INT DEFAULT 0,
        available_beds INT DEFAULT 0,
        icu_beds INT DEFAULT 0,
        emergency_beds INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Doctors table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS doctors (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36) NOT NULL,
        hospital_id VARCHAR(36) NOT NULL,
        license_no VARCHAR(50) UNIQUE NOT NULL,
        specialization VARCHAR(100),
        experience_years INT DEFAULT 0,
        consultation_fee DECIMAL(10,2) DEFAULT 0,
        is_available BOOLEAN DEFAULT TRUE,
        availability_schedule JSON,
        rating DECIMAL(3,2) DEFAULT 5.00,
        total_patients INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
      )
    `);

    // Admins table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36) NOT NULL,
        hospital_id VARCHAR(36) NOT NULL,
        position VARCHAR(100),
        permissions JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
      )
    `);

    // Appointments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        patient_id VARCHAR(36) NOT NULL,
        doctor_id VARCHAR(36) NOT NULL,
        hospital_id VARCHAR(36) NOT NULL,
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        status ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
        type ENUM('consultation', 'follow_up', 'checkup', 'emergency') DEFAULT 'consultation',
        symptoms TEXT,
        notes TEXT,
        prescription TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
      )
    `);

    // Blood bank table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS blood_bank (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        hospital_id VARCHAR(36) NOT NULL,
        blood_type ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
        units_available INT DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
        UNIQUE KEY unique_hospital_blood_type (hospital_id, blood_type)
      )
    `);

    // Notifications table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('appointment', 'reminder', 'emergency', 'general', 'system') DEFAULT 'general',
        is_read BOOLEAN DEFAULT FALSE,
        scheduled_for TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Symptom logs table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS symptom_logs (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        patient_id VARCHAR(36) NOT NULL,
        symptoms TEXT NOT NULL,
        ai_analysis JSON,
        severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
        recommended_action TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Emergency cases table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS emergency_cases (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        patient_id VARCHAR(36) NOT NULL,
        location JSON NOT NULL,
        status ENUM('pending', 'dispatched', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
        ambulance_id VARCHAR(36),
        emergency_type VARCHAR(100),
        description TEXT,
        priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'high',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // OTP verifications table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36),
        email VARCHAR(100),
        phone VARCHAR(20),
        otp_code VARCHAR(6) NOT NULL,
        type ENUM('email', 'sms', 'login', 'signup') NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    connection.release();
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error.message);
    throw error;
  }
}

// Test connection and initialize tables
testConnection().then(() => {
  initializeTables();
});

module.exports = pool;