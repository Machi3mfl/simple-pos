#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const INJECTOR_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const PROJECT_ROOT = path.resolve(INJECTOR_ROOT, "../../..");
const DATASETS_ROOT = path.join(INJECTOR_ROOT, "datasets");
const DEMO_AUTH_USERS_PATH = path.join(
  DATASETS_ROOT,
  "access-control",
  "demo-auth-users.json",
);
const DEFAULT_ENV_FILE = path.join(PROJECT_ROOT, ".env.local");
const PRODUCT_SOURCING_BUCKET = "product-sourcing-images";
const DEFAULT_APP_BASE_URL = "http://127.0.0.1:3001";
const DEFAULT_ONBOARDING_ADMIN_APP_USER_ID = "user_admin_bootstrap";
const DEFAULT_ONBOARDING_ADMIN_NAME = "System Admin";
const DEFAULT_ONBOARDING_ADMIN_EMAIL = "admin@simple-pos.local";
const DEFAULT_ONBOARDING_ADMIN_PASSWORD_LENGTH = 20;

const COLORS = {
  reset: "\u001b[0m",
  info: "\u001b[1;34m",
  ok: "\u001b[1;32m",
  warn: "\u001b[1;33m",
  err: "\u001b[1;31m",
};

function log(level, color, message) {
  const now = new Date().toISOString().slice(11, 19);
  process.stdout.write(`${color}[${now}] [${level}] ${message}${COLORS.reset}\n`);
}

function logInfo(message) {
  log("INFO", COLORS.info, message);
}

function logOk(message) {
  log(" OK ", COLORS.ok, message);
}

function logWarn(message) {
  log("WARN", COLORS.warn, message);
}

function logErr(message) {
  process.stderr.write(`${COLORS.err}[${new Date().toISOString().slice(11, 19)}] [ERR ] ${message}${COLORS.reset}\n`);
}

function abort(message) {
  throw new Error(message);
}

function parseBoolean(value, fallback = false) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function ensureArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value;
}

function splitCategoryPath(categoryPath) {
  return categoryPath
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/**
 * @typedef {object} DemoAuthUserRecord
 * @property {number} priority
 * @property {string} appUserId
 * @property {string} displayName
 * @property {string[]} roleCodes
 * @property {string} email
 * @property {string} password
 * @property {string} purpose
 */

/**
 * @typedef {object} DemoAuthUsersManifest
 * @property {string} environment
 * @property {string} loginUrl
 * @property {string[]} notes
 * @property {DemoAuthUserRecord[]} users
 */

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function parseEnvContent(content) {
  const env = {};
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const index = line.indexOf("=");
    if (index === -1) {
      continue;
    }

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function loadSupabaseCliEnv() {
  try {
    const { stdout } = await execFileAsync("supabase", ["status", "-o", "env"], {
      cwd: PROJECT_ROOT,
      maxBuffer: 1024 * 1024,
    });
    return parseEnvContent(stdout);
  } catch {
    return {};
  }
}

async function loadEnvironment() {
  const envFile =
    process.env.INJECTOR_ENV_FILE ??
    process.env.ENV_FILE ??
    process.env.DOTENV_CONFIG_PATH ??
    DEFAULT_ENV_FILE;
  let fileEnv = {};
  if (await fileExists(envFile)) {
    fileEnv = parseEnvContent(await fs.readFile(envFile, "utf8"));
  }

  const merged = {
    ...fileEnv,
    ...process.env,
  };

  let supabaseUrl =
    merged.INJECTOR_SUPABASE_URL ??
    merged.NEXT_PUBLIC_SUPABASE_URL ??
    merged.SUPABASE_URL ??
    "";
  let serviceRoleKey =
    merged.INJECTOR_SUPABASE_SERVICE_ROLE_KEY ?? merged.SUPABASE_SERVICE_ROLE_KEY ?? "";
  let anonKey =
    merged.INJECTOR_SUPABASE_ANON_KEY ?? merged.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    const cliEnv = await loadSupabaseCliEnv();
    supabaseUrl ||= cliEnv.NEXT_PUBLIC_SUPABASE_URL ?? cliEnv.API_URL ?? cliEnv.SUPABASE_URL ?? "";
    serviceRoleKey ||= cliEnv.SUPABASE_SERVICE_ROLE_KEY ?? cliEnv.SERVICE_ROLE_KEY ?? "";
    anonKey ||= cliEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? cliEnv.ANON_KEY ?? "";
  }

  if (!supabaseUrl) {
    abort(`Missing NEXT_PUBLIC_SUPABASE_URL. Checked ${envFile} and supabase status -o env.`);
  }

  if (!serviceRoleKey) {
    abort(`Missing SUPABASE_SERVICE_ROLE_KEY. Checked ${envFile} and supabase status -o env.`);
  }

  const normalizedSupabaseUrl = supabaseUrl.replace(/\/$/u, "");
  const isLocalSupabase =
    /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/u.test(normalizedSupabaseUrl) ||
    normalizedSupabaseUrl.includes("supabase.local");

  return {
    envFile,
    supabaseUrl: normalizedSupabaseUrl,
    serviceRoleKey,
    anonKey,
    appBaseUrl: (
      merged.INJECTOR_APP_BASE_URL ??
      merged.NEXT_PUBLIC_APP_URL ??
      DEFAULT_APP_BASE_URL
    ).replace(/\/$/u, ""),
    targetName:
      merged.INJECTOR_TARGET_NAME ?? (isLocalSupabase ? "local-development" : "remote"),
    isLocalSupabase,
    allowRemoteWrite: parseBoolean(merged.INJECTOR_ALLOW_REMOTE_WRITE, false),
    allowDemoAuthUsersOnRemote: parseBoolean(
      merged.INJECTOR_ALLOW_DEMO_AUTH_USERS_ON_REMOTE,
      false,
    ),
    onboarding: {
      adminAppUserId:
        merged.INJECTOR_ONBOARDING_ADMIN_APP_USER_ID ??
        DEFAULT_ONBOARDING_ADMIN_APP_USER_ID,
      adminDisplayName:
        merged.INJECTOR_ONBOARDING_ADMIN_NAME ?? DEFAULT_ONBOARDING_ADMIN_NAME,
      adminEmail:
        merged.INJECTOR_ONBOARDING_ADMIN_EMAIL ?? DEFAULT_ONBOARDING_ADMIN_EMAIL,
      adminActorKind: merged.INJECTOR_ONBOARDING_ADMIN_ACTOR_KIND ?? "human",
      passwordLength: Number(
        merged.INJECTOR_ONBOARDING_ADMIN_PASSWORD_LENGTH ??
          String(DEFAULT_ONBOARDING_ADMIN_PASSWORD_LENGTH),
      ),
      resetPasswordOnEveryRun: parseBoolean(
        merged.INJECTOR_ONBOARDING_ADMIN_RESET_PASSWORD,
        true,
      ),
      forceEmailConfirm: parseBoolean(
        merged.INJECTOR_ONBOARDING_ADMIN_FORCE_EMAIL_CONFIRM,
        true,
      ),
    },
  };
}

async function loadDataset(entity) {
  const entityDir = path.join(DATASETS_ROOT, entity);
  const files = (await fs.readdir(entityDir)).filter((file) => file.endsWith(".json")).sort();
  const records = [];

  for (const file of files) {
    const parsed = JSON.parse(await fs.readFile(path.join(entityDir, file), "utf8"));
    if (Array.isArray(parsed)) {
      records.push(...parsed);
      continue;
    }

    if (parsed && Array.isArray(parsed.records)) {
      records.push(...parsed.records);
      continue;
    }

    records.push(parsed);
  }

  return records;
}

async function loadDemoAuthUsersManifest() {
  const parsed = JSON.parse(await fs.readFile(DEMO_AUTH_USERS_PATH, "utf8"));
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.users)) {
    abort(`Invalid auth users manifest at ${DEMO_AUTH_USERS_PATH}.`);
  }

  return /** @type {DemoAuthUsersManifest} */ (parsed);
}

function createAnonClient(env) {
  if (!env.anonKey) {
    abort(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Required to sign in the demo system admin for authenticated injector requests.",
    );
  }

  return createClient(env.supabaseUrl, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function createServiceRoleClient(env) {
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function request(method, url, { headers = {}, body, expectJson = true } = {}) {
  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  const text = await response.text();
  if (!expectJson) {
    return { response, data: null, text };
  }

  if (!text) {
    return { response, data: null, text };
  }

  try {
    return { response, data: JSON.parse(text), text };
  } catch {
    return { response, data: null, text };
  }
}

function supabaseHeaders(env, extraHeaders = {}) {
  return {
    apikey: env.serviceRoleKey,
    Authorization: `Bearer ${env.serviceRoleKey}`,
    ...extraHeaders,
  };
}

async function requestSupabase(env, method, route, { body, headers = {}, expectJson = true } = {}) {
  return request(method, `${env.supabaseUrl}${route}`, {
    headers: supabaseHeaders(env, headers),
    body,
    expectJson,
  });
}

async function requestApp(env, method, apiPath, { jsonBody, accessToken } = {}) {
  const headers = jsonBody === undefined ? {} : { "content-type": "application/json" };
  if (typeof accessToken === "string" && accessToken.trim().length > 0) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return request(method, `${env.appBaseUrl}${apiPath}`, {
    headers,
    body: jsonBody === undefined ? undefined : JSON.stringify(jsonBody),
  });
}

async function requireAppReachable(env) {
  try {
    const controller = AbortSignal.timeout(4000);
    const response = await fetch(env.appBaseUrl, { signal: controller });
    if (response.status >= 100 && response.status < 600) {
      return;
    }
  } catch {
    // noop
  }

  abort(`Could not reach app server at ${env.appBaseUrl}. Start Next.js first (for example: npm run dev).`);
}

async function listAuthUsers(env) {
  const adminClient = createServiceRoleClient(env);
  const users = [];
  let page = 1;

  while (true) {
    const response = await adminClient.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (response.error) {
      abort(`Failed to list auth users: ${response.error.message}`);
    }

    const batch = ensureArray(response.data.users);
    users.push(...batch);
    if (batch.length < 200) {
      break;
    }
    page += 1;
  }

  return users;
}

async function findAuthUserByEmail(env, email) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = await listAuthUsers(env);
  return (
    users.find((user) => (user.email ?? "").trim().toLowerCase() === normalizedEmail) ??
    null
  );
}

async function ensureDemoAuthUsers(env, authManifest) {
  const adminClient = createServiceRoleClient(env);
  logInfo(`Reconciling ${authManifest.users.length} demo auth users.`);

  for (const userRecord of [...authManifest.users].sort((left, right) => left.priority - right.priority)) {
    const appUserRows = await listRows(env, "app_users", [["id", `eq.${userRecord.appUserId}`]]);
    const appUser = appUserRows[0];
    if (!appUser) {
      abort(`App user ${userRecord.appUserId} was not found. Run POS-002 seeds first.`);
    }

    const normalizedEmail = userRecord.email.trim().toLowerCase();
    const currentAuthUserId =
      typeof appUser.auth_user_id === "string" && appUser.auth_user_id.length > 0
        ? appUser.auth_user_id
        : null;

    let authUserId = currentAuthUserId;
    if (!authUserId) {
      const existingAuthUser = await findAuthUserByEmail(env, normalizedEmail);
      authUserId = existingAuthUser?.id ?? null;
    }

    if (authUserId) {
      const updateResponse = await adminClient.auth.admin.updateUserById(authUserId, {
        email: normalizedEmail,
        password: userRecord.password,
        email_confirm: true,
        user_metadata: {
          app_user_id: userRecord.appUserId,
          display_name: userRecord.displayName,
        },
      });
      if (updateResponse.error) {
        abort(
          `Failed to update auth user ${userRecord.appUserId} (${normalizedEmail}): ${updateResponse.error.message}`,
        );
      }
    } else {
      const createResponse = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: userRecord.password,
        email_confirm: true,
        user_metadata: {
          app_user_id: userRecord.appUserId,
          display_name: userRecord.displayName,
        },
      });

      if (createResponse.error || !createResponse.data.user?.id) {
        abort(
          `Failed to create auth user ${userRecord.appUserId} (${normalizedEmail}): ${createResponse.error?.message ?? "unknown error"}`,
        );
      }

      authUserId = createResponse.data.user.id;
    }

    await patchRows(env, "app_users", [["id", `eq.${userRecord.appUserId}`]], {
      auth_user_id: authUserId,
    });
  }

  logOk("Demo auth users reconciled successfully.");
}

async function cleanupDemoUsers(env, authManifest) {
  const adminClient = createServiceRoleClient(env);
  logInfo(`Cleaning up ${authManifest.users.length} demo users from auth and app tables.`);

  const authUsers = await listAuthUsers(env);
  const authUserByEmail = new Map(
    authUsers
      .filter((user) => typeof user.email === "string" && user.email.trim().length > 0)
      .map((user) => [user.email.trim().toLowerCase(), user]),
  );

  let deletedAuthUsers = 0;
  let removedRoleAssignments = 0;
  let removedRegisterAssignments = 0;
  let deletedAppUsers = 0;
  let deactivatedAppUsers = 0;

  for (const userRecord of authManifest.users) {
    const appUserRows = await listRows(env, "app_users", [["id", `eq.${userRecord.appUserId}`]]);
    const appUser = appUserRows[0] ?? null;
    const normalizedEmail = userRecord.email.trim().toLowerCase();

    const authUserIdFromAppUser =
      typeof appUser?.auth_user_id === "string" && appUser.auth_user_id.length > 0
        ? appUser.auth_user_id
        : null;
    const authUserIdFromEmail = authUserByEmail.get(normalizedEmail)?.id ?? null;
    const authUserId = authUserIdFromAppUser ?? authUserIdFromEmail;

    if (authUserId) {
      const deletion = await adminClient.auth.admin.deleteUser(authUserId);
      if (deletion.error) {
        logWarn(
          `Could not delete auth user ${normalizedEmail} (${authUserId}): ${deletion.error.message}`,
        );
      } else {
        deletedAuthUsers += 1;
      }
    }

    if (!appUser) {
      continue;
    }

    const deletedAssignments = await deleteRows(env, "user_role_assignments", [
      ["user_id", `eq.${appUser.id}`],
    ]);
    removedRoleAssignments += deletedAssignments.length;

    const deletedRegisterLinks = await deleteRows(env, "cash_register_user_assignments", [
      ["user_id", `eq.${appUser.id}`],
    ]);
    removedRegisterAssignments += deletedRegisterLinks.length;

    try {
      const deletedUsers = await deleteRows(env, "app_users", [["id", `eq.${appUser.id}`]]);
      deletedAppUsers += deletedUsers.length;
    } catch {
      const patchedUsers = await patchRows(env, "app_users", [["id", `eq.${appUser.id}`]], {
        auth_user_id: null,
        is_active: false,
      });
      if (patchedUsers.length > 0) {
        deactivatedAppUsers += 1;
        logWarn(
          `App user ${appUser.id} could not be deleted (likely referenced by audit/history). Deactivated instead.`,
        );
      } else {
        throw new Error(`Failed to cleanup app user ${appUser.id}.`);
      }
    }
  }

  logOk("Demo users cleanup completed.");
  process.stdout.write(
    `  Removed auth users: ${deletedAuthUsers}\n  Removed role assignments: ${removedRoleAssignments}\n  Removed register assignments: ${removedRegisterAssignments}\n  Deleted app users: ${deletedAppUsers}\n  Deactivated app users: ${deactivatedAppUsers}\n`,
  );
}

async function signInDemoSystemAdmin(env, authManifest) {
  const systemAdminRecord = authManifest.users.find((user) =>
    ensureArray(user.roleCodes).includes("system_admin"),
  );

  if (!systemAdminRecord) {
    abort("The demo auth users manifest must include a system_admin user.");
  }

  const anonClient = createAnonClient(env);
  const signInResponse = await anonClient.auth.signInWithPassword({
    email: systemAdminRecord.email,
    password: systemAdminRecord.password,
  });

  if (!signInResponse.data.session?.access_token || signInResponse.error) {
    abort(
      `Failed to sign in demo system admin (${systemAdminRecord.email}): ${signInResponse.error?.message ?? "unknown error"}`,
    );
  }

  return signInResponse.data.session.access_token;
}

function buildRestUrl(table, params) {
  const search = new URLSearchParams({ select: "*" });
  for (const [key, value] of params) {
    search.append(key, value);
  }
  return `/rest/v1/${table}?${search.toString()}`;
}

async function listRows(env, table, params = []) {
  const { response, data, text } = await requestSupabase(env, "GET", buildRestUrl(table, params));
  if (!response.ok) {
    abort(`Supabase GET ${table} failed (${response.status}): ${text}`);
  }
  return ensureArray(data);
}

async function countRows(env, table, params = []) {
  const search = new URLSearchParams({ select: "*" });
  for (const [key, value] of params) {
    search.append(key, value);
  }

  const { response, text } = await requestSupabase(
    env,
    "GET",
    `/rest/v1/${table}?${search.toString()}`,
    {
      headers: {
        Prefer: "count=exact",
        Range: "0-0",
        "Range-Unit": "items",
      },
      expectJson: false,
    },
  );

  if (!response.ok) {
    abort(`Supabase count for ${table} failed (${response.status}): ${text}`);
  }

  const contentRange = response.headers.get("content-range") ?? "";
  const match = contentRange.match(/\/(\d+)$/u);
  return match ? Number(match[1]) : 0;
}

async function patchRows(env, table, filters, payload) {
  const search = new URLSearchParams();
  for (const [key, value] of filters) {
    search.append(key, value);
  }
  const { response, data, text } = await requestSupabase(
    env,
    "PATCH",
    `/rest/v1/${table}?${search.toString()}`,
    {
      body: JSON.stringify(payload),
      headers: {
        Prefer: "return=representation",
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    abort(`Supabase PATCH ${table} failed (${response.status}): ${text}`);
  }

  return ensureArray(data);
}

async function insertRows(env, table, payload) {
  const { response, data, text } = await requestSupabase(env, "POST", `/rest/v1/${table}`, {
    body: JSON.stringify(payload),
    headers: {
      Prefer: "return=representation",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    abort(`Supabase POST ${table} failed (${response.status}): ${text}`);
  }

  return ensureArray(data);
}

async function deleteRows(env, table, filters) {
  const search = new URLSearchParams();
  for (const [key, value] of filters) {
    search.append(key, value);
  }
  const { response, data, text } = await requestSupabase(
    env,
    "DELETE",
    `/rest/v1/${table}?${search.toString()}`,
    {
      headers: { Prefer: "return=representation" },
    },
  );

  if (!response.ok && response.status !== 404) {
    abort(`Supabase DELETE ${table} failed (${response.status}): ${text}`);
  }

  return ensureArray(data);
}

async function deleteStorageObject(env, bucket, objectPath) {
  if (!objectPath) {
    return;
  }

  const encodedPath = objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const { response, text } = await requestSupabase(
    env,
    "DELETE",
    `/storage/v1/object/${bucket}/${encodedPath}`,
    { expectJson: false },
  );

  if (!response.ok && response.status !== 404) {
    abort(`Storage delete failed for ${bucket}/${objectPath} (${response.status}): ${text}`);
  }
}

async function listStorageEntries(env, bucket, prefix = "") {
  const { response, data, text } = await requestSupabase(
    env,
    "POST",
    `/storage/v1/object/list/${bucket}`,
    {
      body: JSON.stringify({
        prefix,
        limit: 1000,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      }),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    abort(`Storage list failed for ${bucket}/${prefix} (${response.status}): ${text}`);
  }

  return ensureArray(data);
}

async function listStorageFilesRecursive(env, bucket, prefix = "") {
  const entries = await listStorageEntries(env, bucket, prefix);
  const files = [];

  for (const entry of entries) {
    const nextPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.metadata === null) {
      files.push(...(await listStorageFilesRecursive(env, bucket, nextPath)));
      continue;
    }

    files.push(nextPath);
  }

  return files;
}

async function getImportedSource(env, productRecord) {
  const rows = await listRows(env, "imported_product_sources", [
    ["provider_id", `eq.${productRecord.providerId}`],
    ["source_product_id", `eq.${productRecord.sourceProductId}`],
  ]);
  return rows[0] ?? null;
}

async function getProductById(env, productId) {
  const rows = await listRows(env, "products", [["id", `eq.${productId}`]]);
  return rows[0] ?? null;
}

async function getStockInitialMovement(env, productId) {
  const rows = await listRows(env, "stock_movements", [
    ["product_id", `eq.${productId}`],
    ["movement_type", "eq.inbound"],
    ["reason", "eq.stock_inicial"],
  ]);
  return rows[0] ?? null;
}

async function getCustomerByName(env, customerName) {
  const rows = await listRows(env, "customers", [["name", `eq.${customerName}`]]);
  return rows[0] ?? null;
}

async function getSaleByOccurredAt(env, occurredAt) {
  const rows = await listRows(env, "sales", [["created_at", `eq.${occurredAt}`]]);
  return rows[0] ?? null;
}

async function getPaymentByDemoKey(env, paymentKey) {
  const rows = await listRows(env, "debt_ledger", [
    ["entry_type", "eq.payment"],
    ["notes", `eq.demo:${paymentKey}`],
  ]);
  return rows[0] ?? null;
}

async function syncStaticProductFields(env, productRecord, importedSource) {
  const product = await getProductById(env, importedSource.product_id);
  if (!product) {
    abort(`Product ${importedSource.product_id} not found for ${productRecord.key}.`);
  }

  await patchRows(env, "products", [["id", `eq.${product.id}`]], {
    name: productRecord.name,
    category_id: productRecord.categoryId,
    ean: productRecord.ean,
    price: productRecord.price,
    cost: productRecord.cost,
    min_stock: productRecord.minStock,
    is_active: productRecord.isActive,
    created_at: productRecord.seededAt,
  });

  await patchRows(env, "imported_product_sources", [["id", `eq.${importedSource.id}`]], {
    imported_at: productRecord.seededAt,
    created_at: productRecord.seededAt,
    mapped_category_id: productRecord.categoryId,
    brand: productRecord.brand,
    ean: productRecord.ean,
    product_url: productRecord.productUrl,
  });

  const initialMovement = await getStockInitialMovement(env, product.id);
  if (initialMovement) {
    await patchRows(env, "stock_movements", [["id", `eq.${initialMovement.id}`]], {
      occurred_at: productRecord.seededAt,
      reason: "stock_inicial",
    });
  }

  const inventoryItems = await listRows(env, "inventory_items", [["product_id", `eq.${product.id}`]]);
  if (inventoryItems[0]) {
    await patchRows(env, "inventory_items", [["product_id", `eq.${product.id}`]], {
      updated_at: productRecord.seededAt,
    });
  }
}

async function collectManagedProducts(env, productDataset) {
  const managed = [];
  for (const productRecord of productDataset) {
    const importedSource = await getImportedSource(env, productRecord);
    if (!importedSource) {
      continue;
    }
    const product = await getProductById(env, importedSource.product_id);
    managed.push({ productRecord, importedSource, product });
  }
  return managed;
}

async function injectProducts(env, productDataset, accessToken) {
  await requireAppReachable(env);
  logInfo(`Injecting ${productDataset.length} demo products from Carrefour.`);

  const payload = {
    items: productDataset.map((product) => ({
      providerId: product.providerId,
      sourceProductId: product.sourceProductId,
      name: product.name,
      brand: product.brand,
      ean: product.ean,
      categoryTrail: splitCategoryPath(product.sourceCategoryPath),
      categoryId: product.categoryId,
      price: product.price,
      initialStock: product.initialStock,
      minStock: product.minStock,
      cost: product.cost,
      sourceImageUrl: product.sourceImageUrl,
      productUrl: product.productUrl,
    })),
  };

  const { response, data, text } = await requestApp(
    env,
    "POST",
    "/api/v1/product-sourcing/import",
    {
      jsonBody: payload,
      accessToken,
    },
  );

  if (!response.ok) {
    abort(`Product sourcing import failed (${response.status}): ${text}`);
  }

  const invalidItems = ensureArray(data?.invalidItems);
  const hardFailures = invalidItems.filter((item) => item.code !== "already_imported");
  if (hardFailures.length > 0) {
    abort(`Product sourcing import returned invalid items: ${JSON.stringify(hardFailures, null, 2)}`);
  }

  for (const productRecord of productDataset) {
    const importedSource = await getImportedSource(env, productRecord);
    if (!importedSource) {
      abort(`Imported source not found after import for ${productRecord.key}.`);
    }
    await syncStaticProductFields(env, productRecord, importedSource);
  }

  logOk("Products imported or reconciled successfully.");
}

async function resolveProductIdsByKey(env, productDataset) {
  const productIdByKey = new Map();
  for (const productRecord of productDataset) {
    const importedSource = await getImportedSource(env, productRecord);
    if (!importedSource) {
      abort(`Missing sourced product ${productRecord.key}. Run products injection first.`);
    }
    productIdByKey.set(productRecord.key, importedSource.product_id);
  }
  return productIdByKey;
}

async function findStockMovementByReason(env, reason) {
  const rows = await listRows(env, "stock_movements", [["reason", `eq.${reason}`]]);
  return rows[0] ?? null;
}

async function clearDemoDebtPayments(env, debtPaymentDataset) {
  let removed = 0;
  for (const paymentRecord of debtPaymentDataset) {
    const paymentEntry = await getPaymentByDemoKey(env, paymentRecord.key);
    if (!paymentEntry) {
      continue;
    }
    const deleted = await deleteRows(env, "debt_ledger", [["id", `eq.${paymentEntry.id}`]]);
    removed += deleted.length;
  }
  if (removed > 0) {
    logInfo(`Removed ${removed} demo debt payment entries.`);
  }
}

async function clearDemoSales(env, salesDataset, debtPaymentDataset) {
  await clearDemoDebtPayments(env, debtPaymentDataset);

  let removedSales = 0;
  let removedLedger = 0;
  let removedMovements = 0;

  for (const saleRecord of salesDataset) {
    for (const line of saleRecord.items) {
      const movementReason = `demo_sale:${saleRecord.key}:${line.productRef}`;
      const movement = await findStockMovementByReason(env, movementReason);
      if (movement) {
        const deletedMovements = await deleteRows(env, "stock_movements", [["id", `eq.${movement.id}`]]);
        removedMovements += deletedMovements.length;
      }
    }

    const sale = await getSaleByOccurredAt(env, saleRecord.occurredAt);
    if (!sale) {
      continue;
    }

    const ledgerEntries = await listRows(env, "debt_ledger", [["order_id", `eq.${sale.id}`]]);
    for (const entry of ledgerEntries) {
      const deletedEntries = await deleteRows(env, "debt_ledger", [["id", `eq.${entry.id}`]]);
      removedLedger += deletedEntries.length;
    }

    const deletedSales = await deleteRows(env, "sales", [["id", `eq.${sale.id}`]]);
    removedSales += deletedSales.length;
  }

  const demoCustomerNames = Array.from(
    new Set(
      salesDataset
        .map((saleRecord) => saleRecord.customerName)
        .filter((name) => typeof name === "string" && name.length > 0),
    ),
  );

  let removedCustomers = 0;
  for (const customerName of demoCustomerNames) {
    const customer = await getCustomerByName(env, customerName);
    if (!customer) {
      continue;
    }
    const deletedCustomers = await deleteRows(env, "customers", [["id", `eq.${customer.id}`]]);
    removedCustomers += deletedCustomers.length;
  }

  if (removedSales + removedLedger + removedMovements + removedCustomers > 0) {
    logInfo(
      `Removed ${removedSales} demo sales, ${removedMovements} demo outbound movements, ${removedLedger} ledger rows and ${removedCustomers} demo customers.`,
    );
  }
}

async function resetDemoInventoryBaseline(env, productDataset) {
  const managedProducts = await collectManagedProducts(env, productDataset);

  for (const entry of managedProducts) {
    const stockOnHand = Number(entry.productRecord.initialStock);
    const weightedAverageUnitCost =
      stockOnHand > 0 ? Number(entry.productRecord.cost ?? 0) : 0;

    await patchRows(env, "products", [["id", `eq.${entry.importedSource.product_id}`]], {
      stock: stockOnHand,
      cost: entry.productRecord.cost,
    });

    await patchRows(
      env,
      "inventory_items",
      [["product_id", `eq.${entry.importedSource.product_id}`]],
      {
        stock_on_hand: stockOnHand,
        weighted_average_unit_cost: weightedAverageUnitCost,
        updated_at: entry.productRecord.seededAt,
      },
    );
  }
}

async function injectSales(
  env,
  productDataset,
  salesDataset,
  debtPaymentDataset,
  accessToken,
) {
  await requireAppReachable(env);
  const productIdByKey = await resolveProductIdsByKey(env, productDataset);
  await clearDemoSales(env, salesDataset, debtPaymentDataset);
  await resetDemoInventoryBaseline(env, productDataset);

  logInfo(`Injecting ${salesDataset.length} demo sales.`);

  for (const saleRecord of salesDataset) {
    const requiresExplicitCustomerCreation =
      saleRecord.paymentMethod === "on_account" &&
      typeof saleRecord.customerName === "string" &&
      saleRecord.customerName.trim().length > 0;

    const payload = {
      items: saleRecord.items.map((line) => ({
        productId: productIdByKey.get(line.productRef),
        quantity: line.quantity,
      })),
      paymentMethod: saleRecord.paymentMethod,
      ...(saleRecord.customerName ? { customerName: saleRecord.customerName } : {}),
      ...(saleRecord.paymentMethod === "on_account"
        ? { initialPaymentAmount: saleRecord.initialPaymentAmount ?? 0 }
        : {}),
      ...(requiresExplicitCustomerCreation ? { createCustomerIfMissing: true } : {}),
    };

    const { response, data, text } = await requestApp(env, "POST", "/api/v1/sales", {
      jsonBody: payload,
      accessToken,
    });
    if (!response.ok) {
      abort(`Sale injection failed for ${saleRecord.key} (${response.status}): ${text}`);
    }

    const saleId = data?.saleId;
    if (!saleId) {
      abort(`Sale response for ${saleRecord.key} did not return saleId.`);
    }

    await patchRows(env, "sales", [["id", `eq.${saleId}`]], {
      created_at: saleRecord.occurredAt,
    });
    await patchRows(env, "sale_items", [["sale_id", `eq.${saleId}`]], {
      created_at: saleRecord.occurredAt,
    });

    const saleRows = await listRows(env, "sales", [["id", `eq.${saleId}`]]);
    const customerId = saleRows[0]?.customer_id ?? null;
    if (customerId) {
      const customer = await listRows(env, "customers", [["id", `eq.${customerId}`]]);
      if (customer[0]) {
        await patchRows(env, "customers", [["id", `eq.${customerId}`]], {
          created_at: saleRecord.occurredAt,
        });
      }
      const ledgerRows = await listRows(env, "debt_ledger", [["order_id", `eq.${saleId}`]]);
      for (const ledgerRow of ledgerRows) {
        await patchRows(env, "debt_ledger", [["id", `eq.${ledgerRow.id}`]], {
          occurred_at: saleRecord.occurredAt,
        });
      }
    }

    for (const line of saleRecord.items) {
      const movementReason = `demo_sale:${saleRecord.key}:${line.productRef}`;
      const movementPayload = {
        productId: productIdByKey.get(line.productRef),
        movementType: "outbound",
        quantity: line.quantity,
        reason: movementReason,
      };
      const movementResponse = await requestApp(
        env,
        "POST",
        "/api/v1/stock-movements",
        {
          jsonBody: movementPayload,
          accessToken,
        },
      );
      if (!movementResponse.response.ok) {
        abort(`Outbound stock movement failed for ${saleRecord.key}/${line.productRef} (${movementResponse.response.status}): ${movementResponse.text}`);
      }

      const movementId = movementResponse.data?.movementId;
      if (!movementId) {
        abort(`Outbound stock movement response for ${saleRecord.key}/${line.productRef} did not return movementId.`);
      }

      await patchRows(env, "stock_movements", [["id", `eq.${movementId}`]], {
        occurred_at: saleRecord.occurredAt,
        reason: movementReason,
      });
    }
  }

  logOk("Sales injected successfully.");
}

async function getSaleIdByKey(env, salesDataset, saleKey) {
  const saleRecord = salesDataset.find((record) => record.key === saleKey);
  if (!saleRecord) {
    abort(`Unknown saleRef ${saleKey} in debt-payments dataset.`);
  }
  const sale = await getSaleByOccurredAt(env, saleRecord.occurredAt);
  if (!sale) {
    abort(`Sale ${saleKey} was not found. Inject sales first.`);
  }
  return sale.id;
}

async function injectDebtPayments(env, salesDataset, debtPaymentDataset, accessToken) {
  await requireAppReachable(env);
  await clearDemoDebtPayments(env, debtPaymentDataset);
  logInfo(`Injecting ${debtPaymentDataset.length} demo debt payments.`);

  for (const paymentRecord of debtPaymentDataset) {
    const customer = await getCustomerByName(env, paymentRecord.customerName);
    if (!customer) {
      abort(`Customer ${paymentRecord.customerName} was not found. Inject sales first.`);
    }

    const orderId = await getSaleIdByKey(env, salesDataset, paymentRecord.saleRef);
    const payload = {
      customerId: customer.id,
      amount: paymentRecord.amount,
      paymentMethod: "cash",
      orderId,
      notes: `demo:${paymentRecord.key}`,
    };

    const { response, data, text } = await requestApp(
      env,
      "POST",
      "/api/v1/debt-payments",
      {
        jsonBody: payload,
        accessToken,
      },
    );
    if (!response.ok) {
      abort(`Debt payment injection failed for ${paymentRecord.key} (${response.status}): ${text}`);
    }

    const paymentId = data?.paymentId;
    if (!paymentId) {
      abort(`Debt payment response for ${paymentRecord.key} did not return paymentId.`);
    }

    await patchRows(env, "debt_ledger", [["id", `eq.${paymentId}`]], {
      occurred_at: paymentRecord.occurredAt,
      notes: `demo:${paymentRecord.key}`,
    });
  }

  logOk("Debt payments injected successfully.");
}

async function clearDemoProducts(env, productDataset) {
  const managedProducts = await collectManagedProducts(env, productDataset);
  let removedProducts = 0;
  let removedInventory = 0;
  let removedMovements = 0;
  let removedSources = 0;

  for (const entry of managedProducts) {
    const productId = entry.importedSource.product_id;
    const movementRows = await listRows(env, "stock_movements", [["product_id", `eq.${productId}`]]);
    for (const movement of movementRows) {
      const deletedMovements = await deleteRows(env, "stock_movements", [["id", `eq.${movement.id}`]]);
      removedMovements += deletedMovements.length;
    }

    const deletedInventory = await deleteRows(env, "inventory_items", [["product_id", `eq.${productId}`]]);
    removedInventory += deletedInventory.length;

    await deleteStorageObject(env, PRODUCT_SOURCING_BUCKET, entry.importedSource.stored_image_path);

    const deletedSources = await deleteRows(env, "imported_product_sources", [["id", `eq.${entry.importedSource.id}`]]);
    removedSources += deletedSources.length;

    const deletedProducts = await deleteRows(env, "products", [["id", `eq.${productId}`]]);
    removedProducts += deletedProducts.length;
  }

  const categoryPaths = Array.from(new Set(productDataset.map((record) => record.sourceCategoryPath)));
  let removedMappings = 0;
  for (const categoryPath of categoryPaths) {
    const deletedMappings = await deleteRows(env, "external_category_mappings", [
      ["provider_id", "eq.carrefour"],
      ["external_category_path", `eq.${categoryPath}`],
    ]);
    removedMappings += deletedMappings.length;
  }

  if (removedProducts + removedInventory + removedMovements + removedSources + removedMappings > 0) {
    logInfo(
      `Removed ${removedProducts} demo products, ${removedInventory} inventory rows, ${removedMovements} stock movements, ${removedSources} import source rows and ${removedMappings} category mappings.`,
    );
  }
}

async function deleteAllRowsByNotNull(env, table, filterColumn) {
  const deleted = await deleteRows(env, table, [[filterColumn, "not.is.null"]]);
  return deleted.length;
}

async function clearProjectData(env) {
  const productImageFiles = await listStorageFilesRecursive(env, "product-images").catch(
    () => [],
  );
  const sourcingImageFiles = await listStorageFilesRecursive(
    env,
    PRODUCT_SOURCING_BUCKET,
  ).catch(() => []);

  const deletedSyncEvents = await deleteAllRowsByNotNull(
    env,
    "sync_events",
    "idempotency_key",
  );
  const deletedDebtLedger = await deleteAllRowsByNotNull(env, "debt_ledger", "id");
  const deletedSales = await deleteAllRowsByNotNull(env, "sales", "id");
  const deletedCustomers = await deleteAllRowsByNotNull(env, "customers", "id");
  const deletedMappings = await deleteAllRowsByNotNull(
    env,
    "external_category_mappings",
    "id",
  );
  const deletedProducts = await deleteAllRowsByNotNull(env, "products", "id");

  for (const objectPath of productImageFiles) {
    await deleteStorageObject(env, "product-images", objectPath);
  }

  for (const objectPath of sourcingImageFiles) {
    await deleteStorageObject(env, PRODUCT_SOURCING_BUCKET, objectPath);
  }

  logInfo(
    `Project data cleared: ${deletedProducts} products, ${deletedSales} sales, ${deletedDebtLedger} debt ledger rows, ${deletedCustomers} customers, ${deletedMappings} category mappings, ${deletedSyncEvents} sync events, ${productImageFiles.length} managed product images, ${sourcingImageFiles.length} sourced images.`,
  );
}

async function collectStatus(env, datasets) {
  const managedProducts = await collectManagedProducts(env, datasets.products);
  const sales = [];
  for (const saleRecord of datasets.sales) {
    const sale = await getSaleByOccurredAt(env, saleRecord.occurredAt);
    if (sale) {
      sales.push(sale);
    }
  }

  const payments = [];
  for (const paymentRecord of datasets.debtPayments) {
    const payment = await getPaymentByDemoKey(env, paymentRecord.key);
    if (payment) {
      payments.push(payment);
    }
  }

  const customers = [];
  const customerNames = Array.from(
    new Set(
      datasets.sales
        .map((saleRecord) => saleRecord.customerName)
        .filter((name) => typeof name === "string" && name.length > 0),
    ),
  );
  for (const customerName of customerNames) {
    const customer = await getCustomerByName(env, customerName);
    if (customer) {
      customers.push(customer);
    }
  }

  return {
    products: managedProducts,
    sales,
    payments,
    customers,
  };
}

async function showStatus(env, datasets) {
  const status = await collectStatus(env, datasets);
  const globalCounts = {
    products: await countRows(env, "products"),
    sales: await countRows(env, "sales"),
    debtPayments: await countRows(env, "debt_ledger", [["entry_type", "eq.payment"]]),
    customers: await countRows(env, "customers"),
  };
  logInfo(`Environment file: ${await fileExists(env.envFile) ? env.envFile : "not found (loaded from process/CLI)"}`);
  logInfo(`Supabase URL: ${env.supabaseUrl}`);
  logInfo(`App base URL: ${env.appBaseUrl}`);
  process.stdout.write("\n");
  process.stdout.write(`  Managed products:  ${status.products.length}/${datasets.products.length}\n`);
  process.stdout.write(`  Managed sales:     ${status.sales.length}/${datasets.sales.length}\n`);
  process.stdout.write(`  Managed payments:  ${status.payments.length}/${datasets.debtPayments.length}\n`);
  process.stdout.write(`  Managed customers: ${status.customers.length}\n`);
  process.stdout.write("\n");
  process.stdout.write(`  Global products:   ${globalCounts.products}\n`);
  process.stdout.write(`  Global sales:      ${globalCounts.sales}\n`);
  process.stdout.write(`  Global payments:   ${globalCounts.debtPayments}\n`);
  process.stdout.write(`  Global customers:  ${globalCounts.customers}\n`);
  process.stdout.write("\n");
  process.stdout.write("  Note: the Sync screen uses browser localStorage; this injector seeds backend data only.\n");
  process.stdout.write("  Note: Sales categories are data-driven from products. If you clear data while the UI is open, refresh the page to reload the empty state.\n");
}

async function showAll(env, datasets) {
  const managedProducts = await collectManagedProducts(env, datasets.products);
  const productSnapshot = managedProducts.map((entry) => ({
    key: entry.productRecord.key,
    productId: entry.product?.id,
    sku: entry.product?.sku,
    name: entry.product?.name,
    categoryId: entry.product?.category_id,
    price: entry.product?.price,
    cost: entry.product?.cost,
    stock: entry.product?.stock,
    minStock: entry.product?.min_stock,
    isActive: entry.product?.is_active,
    importedAt: entry.importedSource.imported_at,
  }));

  const salesSnapshot = [];
  for (const saleRecord of datasets.sales) {
    const sale = await getSaleByOccurredAt(env, saleRecord.occurredAt);
    if (!sale) {
      continue;
    }
    const items = await listRows(env, "sale_items", [["sale_id", `eq.${sale.id}`]]);
    const ledger = await listRows(env, "debt_ledger", [["order_id", `eq.${sale.id}`]]);
    salesSnapshot.push({
      key: saleRecord.key,
      saleId: sale.id,
      paymentMethod: sale.payment_method,
      customerId: sale.customer_id,
      itemCount: items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
      createdAt: sale.created_at,
      ledger,
    });
  }

  const paymentsSnapshot = [];
  for (const paymentRecord of datasets.debtPayments) {
    const payment = await getPaymentByDemoKey(env, paymentRecord.key);
    if (payment) {
      paymentsSnapshot.push({
        key: paymentRecord.key,
        paymentId: payment.id,
        customerId: payment.customer_id,
        orderId: payment.order_id,
        amount: payment.amount,
        occurredAt: payment.occurred_at,
      });
    }
  }

  const report = {
    products: productSnapshot,
    sales: salesSnapshot,
    debtPayments: paymentsSnapshot,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

async function confirmClear() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question("Type CLEAR to remove all managed demo data: ");
    return answer.trim() === "CLEAR";
  } finally {
    rl.close();
  }
}

async function clearAll(env, datasets, force) {
  if (!force) {
    await showStatus(env, datasets);
    const confirmed = await confirmClear();
    if (!confirmed) {
      logWarn("Clear cancelled.");
      return;
    }
  }

  await clearProjectData(env);
  logOk("All project data removed.");
}

function buildGeneratedPassword(length) {
  const targetLength =
    Number.isInteger(length) && length >= 14 ? length : DEFAULT_ONBOARDING_ADMIN_PASSWORD_LENGTH;
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_+-=:.?";
  const bytes = randomBytes(targetLength);
  let output = "";
  for (let index = 0; index < targetLength; index += 1) {
    output += alphabet[bytes[index] % alphabet.length];
  }
  return output;
}

async function ensureSystemAdminRole(env) {
  const rows = await listRows(env, "roles", [["code", "eq.system_admin"]]);
  if (!rows[0]?.id) {
    abort(
      "Role system_admin was not found. Run database migrations before onboarding an admin.",
    );
  }
  return rows[0];
}

async function ensureAdminAppUser(env, roleRow) {
  const appUserId = env.onboarding.adminAppUserId.trim();
  if (!appUserId) {
    abort("INJECTOR_ONBOARDING_ADMIN_APP_USER_ID cannot be empty.");
  }

  const actorKind =
    env.onboarding.adminActorKind === "system" ? "system" : "human";
  const displayName = env.onboarding.adminDisplayName.trim();
  if (displayName.length < 3) {
    abort("INJECTOR_ONBOARDING_ADMIN_NAME must have at least 3 characters.");
  }

  const rows = await listRows(env, "app_users", [["id", `eq.${appUserId}`]]);
  let appUser = rows[0] ?? null;
  if (!appUser) {
    const inserted = await insertRows(env, "app_users", {
      id: appUserId,
      auth_user_id: null,
      display_name: displayName,
      actor_kind: actorKind,
      is_active: true,
      created_at: new Date().toISOString(),
    });
    appUser = inserted[0] ?? null;
  } else {
    const needsUpdate =
      appUser.display_name !== displayName ||
      appUser.actor_kind !== actorKind ||
      appUser.is_active !== true;
    if (needsUpdate) {
      const updated = await patchRows(env, "app_users", [["id", `eq.${appUserId}`]], {
        display_name: displayName,
        actor_kind: actorKind,
        is_active: true,
      });
      appUser = updated[0] ?? appUser;
    }
  }

  if (!appUser?.id) {
    abort("Failed to reconcile onboarding admin app user.");
  }

  const assignmentRows = await listRows(env, "user_role_assignments", [
    ["user_id", `eq.${appUser.id}`],
    ["role_id", `eq.${roleRow.id}`],
  ]);
  if (assignmentRows.length === 0) {
    await insertRows(env, "user_role_assignments", {
      id: `ura_${crypto.randomUUID()}`,
      user_id: appUser.id,
      role_id: roleRow.id,
      assigned_by_user_id: appUser.id,
    });
  }

  return appUser;
}

async function reconcileOnboardingAdminAuthCredentials(env, appUser) {
  const email = env.onboarding.adminEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    abort("INJECTOR_ONBOARDING_ADMIN_EMAIL must be a valid email.");
  }

  const password = buildGeneratedPassword(env.onboarding.passwordLength);
  const adminClient = createServiceRoleClient(env);
  const metadata = {
    app_user_id: appUser.id,
    display_name: appUser.display_name,
    injector_target: env.targetName,
  };
  const forcePasswordReset = env.onboarding.resetPasswordOnEveryRun;
  const emailConfirm = env.onboarding.forceEmailConfirm;

  let authUserId =
    typeof appUser.auth_user_id === "string" && appUser.auth_user_id.length > 0
      ? appUser.auth_user_id
      : null;
  if (!authUserId) {
    const authUser = await findAuthUserByEmail(env, email);
    authUserId = authUser?.id ?? null;
  }

  if (authUserId) {
    const updatePayload = {
      email,
      email_confirm: emailConfirm,
      user_metadata: metadata,
      ...(forcePasswordReset ? { password } : {}),
    };
    const updated = await adminClient.auth.admin.updateUserById(authUserId, updatePayload);
    if (updated.error) {
      abort(
        `Failed to update onboarding admin auth user (${email}): ${updated.error.message}`,
      );
    }
  } else {
    const created = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: emailConfirm,
      user_metadata: metadata,
    });
    if (created.error || !created.data.user?.id) {
      abort(
        `Failed to create onboarding admin auth user (${email}): ${created.error?.message ?? "unknown error"}`,
      );
    }
    authUserId = created.data.user.id;
  }

  if (appUser.auth_user_id !== authUserId) {
    await patchRows(env, "app_users", [["id", `eq.${appUser.id}`]], {
      auth_user_id: authUserId,
    });
  }

  return {
    appUserId: appUser.id,
    displayName: appUser.display_name,
    email,
    password: forcePasswordReset ? password : "(password unchanged)",
    passwordSha256: forcePasswordReset
      ? createHash("sha256").update(password).digest("hex")
      : null,
    authUserId,
    passwordWasReset: forcePasswordReset,
  };
}

async function runOnboardingAdmin(env) {
  logInfo(
    `Running admin onboarding for target=${env.targetName} supabase=${env.supabaseUrl}.`,
  );

  const systemAdminRole = await ensureSystemAdminRole(env);
  const appUser = await ensureAdminAppUser(env, systemAdminRole);
  const result = await reconcileOnboardingAdminAuthCredentials(env, appUser);

  logOk("Admin onboarding completed.");
  process.stdout.write("\n");
  process.stdout.write("  Onboarding credentials (store securely):\n");
  process.stdout.write(`    appUserId:  ${result.appUserId}\n`);
  process.stdout.write(`    displayName:${result.displayName}\n`);
  process.stdout.write(`    email:      ${result.email}\n`);
  process.stdout.write(`    password:   ${result.password}\n`);
  process.stdout.write(`    authUserId: ${result.authUserId}\n`);
  if (result.passwordSha256) {
    process.stdout.write(
      `    passwordSha256: ${result.passwordSha256} (debug receipt only)\n`,
    );
  }
  process.stdout.write("\n");
  process.stdout.write(
    "  Note: Supabase Auth stores password hashes internally; plaintext is never stored in app tables.\n",
  );
}

function assertCommandWriteSafety(env, command, allowRemoteWriteFlag) {
  const mutatingCommands = new Set([
    "all",
    "auth-users",
    "cleanup-demo-users",
    "products",
    "sales",
    "debt-payments",
    "clear-all",
    "onboarding-admin",
  ]);
  if (!mutatingCommands.has(command)) {
    return;
  }

  const allowRemoteWrite = allowRemoteWriteFlag || env.allowRemoteWrite;
  if (!env.isLocalSupabase && !allowRemoteWrite) {
    abort(
      `Blocked mutating command "${command}" for non-local target "${env.supabaseUrl}". Set INJECTOR_ALLOW_REMOTE_WRITE=true or pass --allow-remote-write if you are sure.`,
    );
  }
}

function assertDemoAuthUsersSafety(env) {
  if (env.isLocalSupabase || env.allowDemoAuthUsersOnRemote) {
    return;
  }

  abort(
    "Demo auth users provisioning is blocked for non-local targets. Use onboarding-admin for first bootstrap, or set INJECTOR_ALLOW_DEMO_AUTH_USERS_ON_REMOTE=true if this is an intentional staging seed.",
  );
}

function printHelp() {
  process.stdout.write(`Simple POS demo injector\n\n`);
  process.stdout.write(`Usage:\n`);
  process.stdout.write(`  bash workflow-manager/docs/injector/injector.sh all\n`);
  process.stdout.write(`  bash workflow-manager/docs/injector/injector.sh auth-users\n`);
  process.stdout.write(`  bash workflow-manager/docs/injector/injector.sh cleanup-demo-users\n`);
  process.stdout.write(`  bash workflow-manager/docs/injector/injector.sh products\n`);
  process.stdout.write(`  bash workflow-manager/docs/injector/injector.sh sales\n`);
  process.stdout.write(`  bash workflow-manager/docs/injector/injector.sh debt-payments\n`);
  process.stdout.write(`  bash workflow-manager/docs/injector/injector.sh onboarding-admin\n`);
  process.stdout.write(`  bash workflow-manager/docs/injector/injector.sh status\n`);
  process.stdout.write(`  bash workflow-manager/docs/injector/injector.sh show-all\n`);
  process.stdout.write(`  bash workflow-manager/docs/injector/injector.sh clear-all\n`);
  process.stdout.write(`  bash workflow-manager/docs/injector/injector.sh clear-all -f\n`);
  process.stdout.write(`\nFlags:\n`);
  process.stdout.write(`  --allow-remote-write  Allow mutating commands against non-local targets\n`);
}

async function selectInteractiveCommand() {
  const options = [
    ["all", "Inject demo products + sales + debt payments"],
    ["auth-users", "Provision demo auth users for local login"],
    ["cleanup-demo-users", "Delete/deactivate demo users and their auth credentials"],
    ["products", "Inject or reconcile sourced demo products"],
    ["sales", "Recreate demo sales and outbound stock movements"],
    ["debt-payments", "Recreate demo debt payments"],
    ["onboarding-admin", "Create or reconcile a secure system_admin login"],
    ["status", "Show managed demo counts"],
    ["show-all", "Print managed demo snapshot"],
    ["clear-all", "Delete all managed demo data"],
  ];

  process.stdout.write("Select an action:\n");
  options.forEach(([command, description], index) => {
    process.stdout.write(`  ${index + 1}. ${command.padEnd(13)} ${description}\n`);
  });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question("Choice: ");
    const index = Number(answer) - 1;
    if (Number.isInteger(index) && options[index]) {
      return options[index][0];
    }
  } finally {
    rl.close();
  }

  abort("Invalid menu choice.");
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const force = rawArgs.includes("-f") || rawArgs.includes("--force");
  const allowRemoteWriteFlag =
    rawArgs.includes("--allow-remote-write") || rawArgs.includes("--allow-remote");
  const args = rawArgs.filter(
    (arg) =>
      arg !== "-f" &&
      arg !== "--force" &&
      arg !== "--allow-remote-write" &&
      arg !== "--allow-remote",
  );
  const command = args[0] ?? (await selectInteractiveCommand());

  if (["help", "--help", "-h"].includes(command)) {
    printHelp();
    return;
  }

  const datasets = {
    authUsers: await loadDemoAuthUsersManifest(),
    products: await loadDataset("products"),
    sales: await loadDataset("sales"),
    debtPayments: await loadDataset("debt-payments"),
  };
  const env = await loadEnvironment();
  assertCommandWriteSafety(env, command, allowRemoteWriteFlag);
  const getSystemAdminAccessToken = async () => {
    assertDemoAuthUsersSafety(env);
    await ensureDemoAuthUsers(env, datasets.authUsers);
    return signInDemoSystemAdmin(env, datasets.authUsers);
  };

  switch (command) {
    case "all":
      {
        const accessToken = await getSystemAdminAccessToken();
        await injectProducts(env, datasets.products, accessToken);
        await injectSales(
          env,
          datasets.products,
          datasets.sales,
          datasets.debtPayments,
          accessToken,
        );
        await injectDebtPayments(
          env,
          datasets.sales,
          datasets.debtPayments,
          accessToken,
        );
      }
      break;
    case "auth-users":
      assertDemoAuthUsersSafety(env);
      await ensureDemoAuthUsers(env, datasets.authUsers);
      break;
    case "cleanup-demo-users":
      await cleanupDemoUsers(env, datasets.authUsers);
      break;
    case "products":
      await injectProducts(env, datasets.products, await getSystemAdminAccessToken());
      break;
    case "sales":
      await injectSales(
        env,
        datasets.products,
        datasets.sales,
        datasets.debtPayments,
        await getSystemAdminAccessToken(),
      );
      break;
    case "debt-payments":
      await injectDebtPayments(
        env,
        datasets.sales,
        datasets.debtPayments,
        await getSystemAdminAccessToken(),
      );
      break;
    case "onboarding-admin":
      await runOnboardingAdmin(env);
      break;
    case "status":
      await showStatus(env, datasets);
      break;
    case "show-all":
      await showAll(env, datasets);
      break;
    case "clear-all":
      await clearAll(env, datasets, force);
      break;
    default:
      printHelp();
      abort(`Unknown injector command: ${command}`);
  }
}

main().catch((error) => {
  logErr(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
