ALTER TABLE members
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

WITH ranked_matches AS (
    SELECT m.id AS member_id,
           u.id AS user_id,
           row_number() OVER (PARTITION BY u.id ORDER BY m.id) AS match_number
    FROM members m
    JOIN users u ON LOWER(m.email) = LOWER(u.email)
    WHERE u.role = 'member'
      AND m.user_id IS NULL
)
UPDATE members m
SET user_id = matches.user_id
FROM ranked_matches matches
WHERE matches.member_id = m.id
  AND matches.match_number = 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_members_user_id
    ON members (user_id)
    WHERE user_id IS NOT NULL;

UPDATE users u
SET mess_group_id = m.mess_group_id,
    updated_at = NOW()
FROM members m
WHERE m.user_id = u.id
  AND u.role = 'member'
  AND u.mess_group_id IS DISTINCT FROM m.mess_group_id;
