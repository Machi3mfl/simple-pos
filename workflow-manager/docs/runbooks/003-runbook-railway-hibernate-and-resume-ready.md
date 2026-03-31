# Runbook: Railway Hibernate and Resume

## Document Metadata

**Document ID**: `003`  
**File Name**: `003-runbook-railway-hibernate-and-resume-ready.md`  
**Status**: `ready`  
**Owner**: `project-owner`  
**Author**: `codex`  
**Version**: `0.1`  
**Created At**: `2026-03-31`  
**Last Updated**: `2026-03-31`  
**Source Plan**: `workflow-manager/docs/features/RELEASE-001-release-hardening-and-reporting-draft.md`

---

## 1. Objective

Temporarily stop the `simple-pos` Railway project when it is not in active use, without deleting services, volumes, or project configuration, so the environment can be resumed later with minimal friction.

---

## 2. When to Use This Runbook

Use this runbook when:

- the project will sit idle for days or weeks
- you want to stop compute consumption
- you need to preserve the Railway project, service topology, and attached volumes for later recovery

Do not use this runbook when:

- you need to fully decommission the environment
- you want to delete data volumes
- you are preparing a production release window

---

## 3. Preconditions

- Railway CLI installed and authenticated
- local shell linked to the target repo directory
- permission to stop all services in the target Railway environment
- awareness that storage volumes remain allocated while services are offline

Recommended verification:

```bash
railway --version
railway link -p simple-pos
railway service status -a
```

---

## 4. Hibernate Checklist

1. Link the local directory to the correct Railway project:

```bash
railway link -p simple-pos
```

2. Review which services exist in the linked environment:

```bash
railway status --json | jq -r '.environments.edges[].node.serviceInstances.edges[].node.serviceName' | sort -u
```

3. Stop every active service in the linked environment:

```bash
railway status --json \
| jq -r '.environments.edges[].node.serviceInstances.edges[].node.serviceName' \
| sort -u \
| while IFS= read -r service; do
  railway down -s "$service" -y
done
```

4. Verify the environment is offline:

```bash
railway service status -a
```

Expected result:

- Supabase and app services show `NO DEPLOYMENT` or `Service is offline`
- no service remains actively deployed for the hibernated environment

5. If GitHub autodeploy is enabled for any service, disconnect it in the Railway dashboard before leaving the project idle. This avoids a future push redeploying the stack unintentionally.

---

## 5. Resume Checklist

### App service (`simple-pos`)

If you want to redeploy the current repository state for the app service:

```bash
railway up -s simple-pos
```

### Supporting services (Supabase / image-based services)

To restore a previously deployed service definition:

```bash
railway redeploy -s Postgres -y
railway redeploy -s "Gotrue Auth" -y
railway redeploy -s Postgrest -y
railway redeploy -s "Supabase Realtime" -y
railway redeploy -s "Supabase Storage" -y
railway redeploy -s "Supabase Studio" -y
railway redeploy -s "Postgres Meta" -y
railway redeploy -s S3 -y
railway redeploy -s Imgproxy -y
railway redeploy -s Kong -y
```

Suggested order:

1. `Postgres`
2. `Gotrue Auth`, `Postgrest`, `Supabase Realtime`, `Supabase Storage`
3. `Supabase Studio`, `Postgres Meta`, `Imgproxy`, `S3`, `Kong`
4. `simple-pos`

After resume, verify:

```bash
railway service status -a
```

Optional application smoke checks:

```bash
npm run lint
npm run test
```

Use the smoke checks only if the local repo state matches what you intend to run.

---

## 6. Cost and Safety Notes

- Stopping services removes compute usage, but attached volumes can still incur storage cost.
- For this project, pay special attention to `postgres-volume` and `s3-volume`.
- `railway down` does not delete the service itself. It removes the latest successful deployment from the environment.
- Resuming `simple-pos` with `railway up -s simple-pos` deploys the code currently present in the local repository.
- If you need an exact previous deployment instead of the current local code, prefer `railway redeploy -s simple-pos -y`.

---

## 7. Recovery Notes for This Project

The `simple-pos` Railway project currently includes:

- the application service: `simple-pos`
- a Supabase support stack: `Postgres`, `Gotrue Auth`, `Postgrest`, `Supabase Realtime`, `Supabase Storage`, `Supabase Studio`, `Postgres Meta`, `Imgproxy`, `S3`, `Kong`

When returning to active development after a long idle period:

1. Bring core data and auth services up first.
2. Bring the app service up last.
3. Confirm environment variables still match the intended target.
4. Run the minimal validation needed before continuing feature work.
