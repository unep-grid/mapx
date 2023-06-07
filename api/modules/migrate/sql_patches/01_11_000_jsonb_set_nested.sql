CREATE OR REPLACE FUNCTION jsonb_set_nested(jsonb_data jsonb, path text[], value jsonb)
RETURNS jsonb AS $$
DECLARE
  current_key text;
  next_data jsonb;
BEGIN
  IF array_length(path, 1) = 1 THEN
    RETURN jsonb_set(jsonb_data, path, value);
  END IF;

  current_key := path[1];
  next_data := jsonb_data -> current_key;

  IF next_data IS NULL THEN
    next_data := '{}'::jsonb;
  END IF;

  RETURN jsonb_set(
    jsonb_data,
    ARRAY[current_key],
    jsonb_set_nested(next_data, path[2:array_length(path, 1)], value)
  );
END;
$$ LANGUAGE plpgsql;
