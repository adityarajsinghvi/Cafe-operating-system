-- Allow 'bill' as a service request type
ALTER TABLE service_requests
  DROP CONSTRAINT IF EXISTS service_requests_request_type_check;

ALTER TABLE service_requests
  ADD CONSTRAINT service_requests_request_type_check
  CHECK (request_type IN ('waiter', 'water', 'bill'));
