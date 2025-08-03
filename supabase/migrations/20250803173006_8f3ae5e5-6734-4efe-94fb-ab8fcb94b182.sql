-- Update the user registration trigger to send welcome emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Insert the new profile
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Send Discord notification for new user registration (with proper error handling)
  BEGIN
    PERFORM
      net.http_post(
        url := 'https://zdegwavcldwlgzzandae.supabase.co/functions/v1/send-discord-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(current_setting('supabase.service_role_key', true), '')
        ),
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
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail user creation
      RAISE WARNING 'Discord notification failed: %', SQLERRM;
  END;

  -- Send welcome email (with proper error handling)
  BEGIN
    PERFORM
      net.http_post(
        url := 'https://zdegwavcldwlgzzandae.supabase.co/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(current_setting('supabase.service_role_key', true), '')
        ),
        body := jsonb_build_object(
          'type', 'welcome_user',
          'to', NEW.email,
          'data', jsonb_build_object(
            'userName', COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.email),
            'userEmail', NEW.email,
            'exploreUrl', 'https://zdegwavcldwlgzzandae.lovable.app/',
            'profileUrl', 'https://zdegwavcldwlgzzandae.lovable.app/',
            'makerRequestUrl', 'https://zdegwavcldwlgzzandae.lovable.app/',
            'userId', NEW.id::text
          )
        )
      );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail user creation
      RAISE WARNING 'Welcome email failed: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$function$;