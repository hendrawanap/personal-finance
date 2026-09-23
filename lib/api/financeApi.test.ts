import assert from "node:assert/strict";
import test from "node:test";
import { apiError, apiNotFound, apiSuccess, apiUnauthorized } from "./response";
import {
  getFallbackStore,
  setFallbackStore,
  resetFallbackStore,
} from "../storage/serverStore";

test("apiSuccess returns proper ApiEnvelope structure", async () => {
  const payload = { id: "acc-123", name: "Checking" };
  const res = apiSuccess(payload, "Account created");
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.deepEqual(json.data, payload);
  assert.equal(json.errors, null);
  assert.equal(json.meta?.success, true);
  assert.equal(json.meta?.message, "Account created");
});

test("apiError returns proper error status and structure", async () => {
  const res = apiError("Invalid amount", 400);
  assert.equal(res.status, 400);

  const json = await res.json();
  assert.equal(json.data, null);
  assert.equal(json.meta?.success, false);
  assert.equal(json.meta?.message, "Invalid amount");
  assert.equal(json.errors[0]?.message, "Invalid amount");
});

test("apiUnauthorized returns 401", async () => {
  const res = apiUnauthorized();
  assert.equal(res.status, 401);

  const json = await res.json();
  assert.equal(json.meta?.success, false);
  assert.equal(json.data, null);
});

test("apiNotFound returns 404", async () => {
  const res = apiNotFound("Account not found");
  assert.equal(res.status, 404);

  const json = await res.json();
  assert.equal(json.meta?.success, false);
  assert.equal(json.meta?.message, "Account not found");
});

test("server fallback store supports get, set, and reset", () => {
  const testUserId = "usr-unit-test-1";
  resetFallbackStore(testUserId);

  const initial = getFallbackStore(testUserId);
  assert.ok(initial.accounts.length > 0);
  assert.ok(initial.transactions.length > 0);

  setFallbackStore(testUserId, {
    accounts: [
      {
        id: "acc-custom-1",
        name: "Custom Account",
        institution: "Bank",
        type: "checking",
        accountNumber: "1234",
        balance: 5000,
        currency: "IDR",
        accent: "moss",
        createdAt: "2026-09-01T00:00:00Z",
      },
    ],
  });

  const updated = getFallbackStore(testUserId);
  assert.equal(updated.accounts.length, 1);
  assert.equal(updated.accounts[0].name, "Custom Account");

  resetFallbackStore(testUserId);
  const resetStore = getFallbackStore(testUserId);
  assert.ok(resetStore.accounts.length > 1);
});
