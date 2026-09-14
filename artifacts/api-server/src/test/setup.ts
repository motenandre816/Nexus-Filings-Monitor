// The db module throws at import time without DATABASE_URL. Tests never touch
// the database (queries are mocked), so a placeholder is enough.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
