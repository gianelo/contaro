-- The first migration owns nothing product-shaped: Spaces, Members, Categories,
-- Movements and Budgets each arrive with their own ticket. What it does own is
-- the extension every one of those tables will want for its primary key.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
