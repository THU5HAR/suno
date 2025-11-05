import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// All project routes require authentication
router.use(authenticateToken);

// Get all projects for user
router.get('/', async (req, res, next) => {
  try {
    const projects = await dbAll(
      'SELECT id, name, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
      [req.user.userId]
    );
    res.json(projects);
  } catch (error) {
    next(error);
  }
});

// Get single project by ID
router.get('/:id', async (req, res, next) => {
  try {
    const project = await dbGet(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Parse JSON data
    const projectData = {
      ...project,
      data: JSON.parse(project.data)
    };

    res.json(projectData);
  } catch (error) {
    next(error);
  }
});

// Create new project
router.post('/', async (req, res, next) => {
  try {
    const { name, data } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const projectId = uuidv4();

    await dbRun(
      'INSERT INTO projects (id, user_id, name, data) VALUES (?, ?, ?, ?)',
      [projectId, req.user.userId, name, JSON.stringify(data || {})]
    );

    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [projectId]);

    res.status(201).json({
      ...project,
      data: JSON.parse(project.data)
    });
  } catch (error) {
    next(error);
  }
});

// Update project
router.put('/:id', async (req, res, next) => {
  try {
    const { name, data } = req.body;

    // Check if project exists and belongs to user
    const existing = await dbGet(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Update project
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (data !== undefined) {
      updates.push('data = ?');
      values.push(JSON.stringify(data));
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    await dbRun(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [req.params.id]);

    res.json({
      ...project,
      data: JSON.parse(project.data)
    });
  } catch (error) {
    next(error);
  }
});

// Delete project
router.delete('/:id', async (req, res, next) => {
  try {
    // Check if project exists and belongs to user
    const existing = await dbGet(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await dbRun('DELETE FROM projects WHERE id = ?', [req.params.id]);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

