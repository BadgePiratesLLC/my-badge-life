-- Update the user registration trigger to send Discord notifications for truly new users
-- We'll create a new function that calls the Discord webhook after a new profile is created

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Insert the new profile
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Send Discord notification for new user registration
  -- We'll use the edge function to send the notification
  PERFORM
    net.http_post(
      url := 'https://zdegwavcldwlgzzandae.supabase.co/functions/v1/send-discord-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('supabase.service_role_key', true) || '"}'::jsonb,
      body := jsonb_build_object(
        'type', 'user_registered',
        'data', jsonb_build_object(
          'title', '👋 New User Registered',
          'description', 'Welcome **' || COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.email) || '** to MyBadgeLife!',
          'fields', jsonb_build_array(
            jsonb_build_object(
              'name', 'Email',
              'value', NEW.email,
              'inline', true
            )
          )
        )
      )
    );
  
  RETURN NEW;
END;
$$;