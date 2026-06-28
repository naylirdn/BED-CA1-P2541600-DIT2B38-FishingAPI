import 'dotenv/config';

export default {
    schema: './src/db/schema.js',
    out: './drizzle',
    dialect: 'sqlite',
    dbCredentials: {
        url: process.env.DATABASE_URL
    }
};