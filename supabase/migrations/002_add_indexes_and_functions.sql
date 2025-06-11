-- migrations/002_add_indexes_and_functions.sql

-- Add indexes for better query performance
CREATE INDEX idx_build_plans_user_id ON build_plans(user_id);
CREATE INDEX idx_build_plans_furniture_type ON build_plans(furniture_type);
CREATE INDEX idx_build_plans_created_at ON build_plans(created_at DESC);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_build_plan_id ON chat_sessions(build_plan_id);

-- Add validation_results column to build_plans
ALTER TABLE build_plans 
ADD COLUMN validation_results JSONB DEFAULT '{}';

-- Add agent_state column to chat_sessions
ALTER TABLE chat_sessions
ADD COLUMN agent_state JSONB DEFAULT '{}';

-- Function to get user's recent plans
CREATE OR REPLACE FUNCTION get_user_recent_plans(p_user_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  name TEXT,
  furniture_type TEXT,
  dimensions JSONB,
  estimated_cost NUMERIC,
  validation_status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id,
    bp.name,
    bp.furniture_type,
    bp.dimensions,
    (bp.plan_data->>'estimated_cost')::NUMERIC as estimated_cost,
    bp.validation_status,
    bp.created_at
  FROM build_plans bp
  WHERE bp.user_id = p_user_id
  ORDER BY bp.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to save or update a build plan
CREATE OR REPLACE FUNCTION upsert_build_plan(
  p_user_id UUID,
  p_plan_data JSONB
) RETURNS UUID AS $$
DECLARE
  v_plan_id UUID;
BEGIN
  -- Extract or generate ID
  v_plan_id := COALESCE(
    (p_plan_data->>'id')::UUID,
    uuid_generate_v4()
  );
  
  INSERT INTO build_plans (
    id,
    user_id,
    name,
    furniture_type,
    dimensions,
    materials,
    plan_data,
    validation_status,
    updated_at
  ) VALUES (
    v_plan_id,
    p_user_id,
    p_plan_data->>'name',
    p_plan_data->>'furniture_type',
    p_plan_data->'dimensions',
    p_plan_data->'materials',
    p_plan_data,
    COALESCE(p_plan_data->>'validation_status', 'pending'),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    furniture_type = EXCLUDED.furniture_type,
    dimensions = EXCLUDED.dimensions,
    materials = EXCLUDED.materials,
    plan_data = EXCLUDED.plan_data,
    validation_status = EXCLUDED.validation_status,
    updated_at = NOW()
  WHERE build_plans.user_id = p_user_id;
  
  RETURN v_plan_id;
END;
$$ LANGUAGE plpgsql;

-- Function to save chat session state
CREATE OR REPLACE FUNCTION save_chat_session(
  p_user_id UUID,
  p_build_plan_id UUID,
  p_messages JSONB,
  p_agent_state JSONB
) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Check if session exists
  SELECT id INTO v_session_id
  FROM chat_sessions
  WHERE user_id = p_user_id 
    AND build_plan_id = p_build_plan_id
  LIMIT 1;
  
  IF v_session_id IS NULL THEN
    -- Create new session
    INSERT INTO chat_sessions (
      user_id,
      build_plan_id,
      messages,
      agent_state
    ) VALUES (
      p_user_id,
      p_build_plan_id,
      p_messages,
      p_agent_state
    ) RETURNING id INTO v_session_id;
  ELSE
    -- Update existing session
    UPDATE chat_sessions
    SET 
      messages = p_messages,
      agent_state = p_agent_state
    WHERE id = v_session_id;
  END IF;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_build_plans_updated_at
  BEFORE UPDATE ON build_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_recent_plans TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_build_plan TO authenticated;
GRANT EXECUTE ON FUNCTION save_chat_session TO authenticated; 