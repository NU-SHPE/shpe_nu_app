import { test, expect } from '@playwright/test';

/**
 * Unauthenticated smoke coverage. No Firebase calls — every assertion here is
 * render, client-side validation, or AuthGate routing. The authenticated flows
 * (real login, email verification, Firestore reads under the isVerified()
 * rules, QR check-in) still need a manual pass on a preview deploy.
 *
 * React Navigation keeps prior screens mounted under the active one, so a
 * plain getByText can match a hidden element from the screen you navigated
 * away from — target buttons by testID, and assert on text unique to the
 * screen under test.
 */

test('login screen renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Welcome Back')).toBeVisible();
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByPlaceholder('Password')).toBeVisible();
  await expect(page.getByTestId('login-submit')).toBeVisible();
});

test('login blocks an empty submit with field errors', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('login-submit').click();
  await expect(page.getByText('Enter your email.')).toBeVisible();
  await expect(page.getByText('Enter your password.')).toBeVisible();
});

test('login rejects a non-chapter email before hitting the network', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Email').fill('someone@gmail.com');
  await page.getByPlaceholder('Password').fill('whatever123');
  await page.getByTestId('login-submit').click();
  await expect(page.getByText(/u\.northwestern\.edu/)).toBeVisible();
});

test('can reach the register screen and its validation fires', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Sign Up', { exact: true }).click();
  await expect(page.getByText('Create Account')).toBeVisible();
  await page.getByTestId('register-submit').click();
  await expect(page.getByText('Enter your first name.')).toBeVisible();
});

test('a direct load of a deep route resolves (SPA rewrite)', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByText('Create Account')).toBeVisible();
});

test('forgot-password: reachable from login, validates before sending', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Forgot password?').click();
  await expect(page.getByText('Reset password')).toBeVisible();

  await page.getByTestId('forgot-submit').click();
  await expect(page.getByText('Enter your email.')).toBeVisible();

  await page.getByTestId('forgot-email').fill('someone@gmail.com');
  await page.getByTestId('forgot-submit').click();
  await expect(page.getByText(/u\.northwestern\.edu/)).toBeVisible();
});

test('AuthGate sends a signed-out user off /verify-email to the login screen', async ({ page }) => {
  await page.goto('/verify-email');
  await expect(page.getByText('Welcome Back')).toBeVisible();
});

test('an unknown route shows not-found, not a crash', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/totally-not-a-real-route');
  await expect(page.getByText('Page could not be found.')).toBeVisible();
  expect(errors).toEqual([]);
});
