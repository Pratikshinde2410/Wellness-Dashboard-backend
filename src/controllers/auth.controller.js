import bcrypt from 'bcrypt';
import { Client } from '../models/Client.js';
import { HealthReport } from '../models/HealthReport.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE = 'refreshToken';

function tokenPayload(client) {
  return {
    client_id: client._id.toString(),
    role: client.role,
    email: client.email,
  };
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const client = await Client.findOne({ email: email.toLowerCase() });
    if (!client) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (client.is_active === false) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'Your account has been deactivated');
    }

    const valid = await bcrypt.compare(password, client.password_hash);
    if (!valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const payload = tokenPayload(client);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    setRefreshCookie(res, refreshToken);

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          _id: client._id,
          client_id: client.client_id,
          full_name: client.full_name,
          email: client.email,
          role: client.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies[REFRESH_COOKIE];
    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Refresh token missing');
    }

    const decoded = verifyRefreshToken(token);
    const client = await Client.findById(decoded.client_id);
    if (!client) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not found');
    }

    const payload = tokenPayload(client);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    setRefreshCookie(res, refreshToken);

    res.json({
      success: true,
      data: { accessToken },
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError(401, 'UNAUTHORIZED', 'Invalid refresh token'));
    }
    next(err);
  }
}

export function logout(_req, res) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  });
  res.json({ success: true, data: { message: 'Logged out' } });
}
