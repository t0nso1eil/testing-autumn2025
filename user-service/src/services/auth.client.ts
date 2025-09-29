import axios from 'axios';
import { Request } from 'express';

export class AuthClient {
    private authServiceUrl: string;

    constructor() {
        this.authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
    }

    async verifyToken(req: Request) {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            throw new Error('Token not provided');
        }

        if (!authHeader.startsWith('Bearer ')) {
            throw new Error('Token not provided');
        }

        const token = authHeader.substring(7);
        if (!token) {
            throw new Error('Token not provided');
        }

        try {
            const response = await axios.get(`${this.authServiceUrl}/auth/verify`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 5000
            });

            return response.data.user;
        } catch (error: any) {
            console.error('Auth verification error:', error);
            throw new Error('Invalid or expired token');
        }
    }
}

export default new AuthClient();