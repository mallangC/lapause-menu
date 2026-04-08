-- subscription_plan: 체험 종료 후 청구할 실제 플랜
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS subscription_plan text;

ALTER TABLE companies
  DROP CONSTRAINT IF EXISTS companies_plan_check;

ALTER TABLE companies
  ADD CONSTRAINT companies_plan_check
  CHECK (plan IN ('none', 'starter', 'pro', 'free'));

ALTER TABLE companies
  ADD CONSTRAINT companies_subscription_plan_check
  CHECK (subscription_plan IN ('starter', 'pro') OR subscription_plan IS NULL);
