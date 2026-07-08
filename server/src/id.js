import { randomBytes } from 'node:crypto'

export const token = (bytes = 18) => randomBytes(bytes).toString('base64url')
export const otpCode = () => String(Math.floor(100000 + Math.random() * 900000))
export const planId = () => 'p_' + randomBytes(9).toString('base64url')
export const marketId = () => 'm_' + randomBytes(9).toString('base64url')
