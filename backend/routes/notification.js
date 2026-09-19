const express = require('express');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Get user notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, title, message, type, is_read, scheduled_for, created_at
      FROM notifications
      WHERE user_id = ?
    `;
    
    const params = [req.user.id];

    if (unreadOnly === 'true') {
      query += ' AND is_read = FALSE';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [notifications] = await pool.execute(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    const countParams = [req.user.id];

    if (unreadOnly === 'true') {
      countQuery += ' AND is_read = FALSE';
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// Mark notification as read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const notificationId = req.params.id;

    // Verify notification belongs to the user
    const [notification] = await pool.execute(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, req.user.id]
    );

    if (notification.length === 0) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    // Mark as read
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ?',
      [notificationId]
    );

    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

// Mark all notifications as read
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read.' });
  }
});

// Delete notification
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const notificationId = req.params.id;

    // Verify notification belongs to the user
    const [notification] = await pool.execute(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, req.user.id]
    );

    if (notification.length === 0) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    // Delete notification
    await pool.execute(
      'DELETE FROM notifications WHERE id = ?',
      [notificationId]
    );

    res.json({ message: 'Notification deleted successfully.' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification.' });
  }
});

// Get notification statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    // Get total notifications count
    const [totalResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
      [req.user.id]
    );

    // Get unread notifications count
    const [unreadResult] = await pool.execute(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    // Get notifications by type
    const [typeStats] = await pool.execute(
      `SELECT type, COUNT(*) as count 
       FROM notifications 
       WHERE user_id = ? 
       GROUP BY type`,
      [req.user.id]
    );

    res.json({
      total: totalResult[0].total,
      unread: unreadResult[0].unread,
      byType: typeStats.reduce((acc, stat) => {
        acc[stat.type] = stat.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ error: 'Failed to fetch notification statistics.' });
  }
});

// Create notification (for system use)
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { userId, title, message, type = 'general', scheduledFor } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'User ID, title, and message are required.' });
    }

    // Insert notification
    await pool.execute(
      `INSERT INTO notifications (user_id, title, message, type, scheduled_for) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, message, type, scheduledFor]
    );

    res.status(201).json({ message: 'Notification created successfully.' });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification.' });
  }
});

module.exports = router;

export default router