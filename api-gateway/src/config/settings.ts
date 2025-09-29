import { config } from 'dotenv';
config();

class Settings {
    PORT = parseInt(process.env.PORT || '4000', 10);
    AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
    USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
    PROPERTY_SERVICE_URL = process.env.PROPERTY_SERVICE_URL || 'http://localhost:3002';
}

export default new Settings();