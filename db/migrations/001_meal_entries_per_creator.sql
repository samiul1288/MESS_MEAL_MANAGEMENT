CREATE UNIQUE INDEX IF NOT EXISTS uq_meal_date_group_creator
    ON meals (mess_group_id, meal_date, meal_type, created_by);

ALTER TABLE meals
    DROP CONSTRAINT IF EXISTS uq_meal_date_group;
