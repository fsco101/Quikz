import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AuthRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'quikz_super_secret_jwt_key_2026_academic_quiz';

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
    if (!termsAccepted) {
      return res.status(400).json({
        message: 'Academic Honor Code and Terms & Conditions must be accepted before account creation.'
      });
    }

    if (!username || !email || !password || !fullName || !surname) {
      return res.status(400).json({
        message: 'All required fields (username, email, password, full name, surname) must be provided.'
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'A user with this username or email already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email: email.toLowerCase(),
      passwordHash,
      role: role === 'faculty' ? 'faculty' : 'student',
      fullName,
      surname,
      yearLevel: yearLevel || '1st Year',
      section: section || 'Section A',
      termsAccepted: true,
      termsAcceptedAt: new Date()
    });

    await newUser.save();

    const token = jwt.sign(
      {
        id: newUser._id,
        role: newUser.role,
        email: newUser.email,
        username: newUser.username
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        fullName: newUser.fullName,
        surname: newUser.surname,
        yearLevel: newUser.yearLevel,
        section: newUser.section,
        termsAccepted: newUser.termsAccepted
      }
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { loginIdentifier, password } = req.body;

    if (!loginIdentifier || !password) {
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

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        surname: user.surname,
        yearLevel: user.yearLevel,
        section: user.section,
        termsAccepted: user.termsAccepted
      }
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Login failed', error: err.message });
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

    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to retrieve user', error: err.message });
  }
};
