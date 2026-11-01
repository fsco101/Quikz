import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AuthRequest } from '../middleware/auth.js';

import { profileFields, userDTO, validatePassword } from '../services/users.js';
import { InputError } from '../services/questionBank.js';
import { JWT_SECRET } from '../config/auth.js';
import { SECTIONS } from '../services/gradebook.js';

export const register = async (req: Request, res: Response) => {
  try {
    const {
      username,
      email,
      password,
      role,
      fullName,
      surname,
      yearLevel,
      section,
      termsAccepted
    } = req.body;

    // Requirement: privacy (terms and condition) before proceeding to account creation
    if (termsAccepted !== true) {
      return res.status(400).json({
        message: 'Academic Honor Code and Terms & Conditions must be accepted before account creation.'
      });
    }

    if ([username, email, password, fullName, surname].some(v => typeof v !== 'string' || !v.trim())) {
      return res.status(400).json({
        message: 'All required fields (username, email, password, full name, surname) must be provided.'
      });
    }

    if (!['faculty', 'student'].includes(role) || (role === 'student' && (!['1st Year', '2nd Year', '3rd Year', '4th Year'].includes(yearLevel) || !SECTIONS.includes(section)))) {
      return res.status(400).json({ message: 'Select a valid role, year level, and section.' });
    }

    validatePassword(password);
    const fields = profileFields({ username, email, fullName, surname });

    const existingUser = await User.findOne({
      $or: [{ email: fields.email }, { username: fields.username }]
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'A user with this username or email already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      ...fields,
      passwordHash,
      role: role === 'faculty' ? 'faculty' : 'student',
      yearLevel: yearLevel || '1st Year',
      section: section || SECTIONS[0],
      termsAccepted: true,
      termsAcceptedAt: new Date()
    });

    await newUser.save();

    const token = jwt.sign(
      {
        id: newUser._id,
        role: newUser.role,
        email: newUser.email,
        username: newUser.username,
        authVersion: newUser.authVersion
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: userDTO(newUser)
    });
  } catch (err: any) {
    if (err instanceof InputError) return res.status(err.status).json({ message: err.message });
    res.status(err.name === 'ValidationError' ? 400 : err.code === 11000 ? 409 : 500).json({ message: 'Registration failed', error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { loginIdentifier, password } = req.body;

    if (typeof loginIdentifier !== 'string' || typeof password !== 'string' || !loginIdentifier || !password) {
      return res.status(400).json({
        message: 'Username/Email and password are required.'
      });
    }

    const user = await User.findOne({
      $or: [
        { email: loginIdentifier.toLowerCase() },
        { username: loginIdentifier }
      ]
    });

    if (!user || user.active === false) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    res.locals.auditActorId = user._id;
    res.locals.auditActorRole = user.role;

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        username: user.username,
        authVersion: user.authVersion
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: userDTO(user)
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Login failed. Please retry.' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: userDTO(user) });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to retrieve user' });
  }
};
