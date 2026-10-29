# FoodHub cloud engineering solution

This folder adds a container build and automated test workflow to the existing FoodHub project.

## What is included

- `Dockerfile`: packages the Express API and static frontend into one Node.js container.
- `compose.yaml`: runs the container with a persistent Docker volume for SQLite. The app is bound to `127.0.0.1:3000`, not exposed directly to the internet.
- `.github/workflows/ci.yml`: runs the existing security regression tests on pushes and pull requests.
- `.dockerignore`: keeps local secrets, Git data, dependencies and local database files out of the image build context.
- `backend/.env.example`: production-oriented environment variable template.

## Important security note

The uploaded archive contained `backend/.env`, Git metadata, and local SQLite database files. Those were deliberately excluded from this cloud-ready copy. Do not upload those files to a public repository. If any real credentials in the original `.env` have been shared or committed, rotate them now. Treat the original archive as sensitive.

## Local container test

Requirements: Docker Engine and Docker Compose plugin.

1. From the project root, create a private environment file:

   ```bash
   cp backend/.env.example backend/.env
   ```

2. Edit `backend/.env`. Set a unique random `SESSION_SECRET`, a strong unique `ADMIN_PASSWORD`, and the actual public website origin in `CORS_ORIGIN`. Do not use the example values.

   Generate a secret with:

   ```bash
   openssl rand -hex 32
   ```

3. Build and start:

   ```bash
   docker compose up --build -d
   ```

4. Check status and logs:

   ```bash
   docker compose ps
   docker compose logs --tail=100 foodhub
   ```

5. Test the app locally:

   ```bash
   curl -i http://127.0.0.1:3000/api/products
   ```

6. Stop it without deleting the database volume:

   ```bash
   docker compose down
   ```

To delete the demo database volume too, use `docker compose down -v`. This permanently deletes the SQLite data stored in that volume.

## Cloud architecture target

The recommended learning path is:

1. Run and test the container locally.
2. Push the cleaned project to a private GitHub repository.
3. Confirm the GitHub Actions test workflow passes.
4. Provision a small AWS environment using Terraform.
5. Deploy the container to a Linux host; put an HTTPS reverse proxy such as Caddy in front of the app.
6. Restrict SSH to your own IP or use AWS Systems Manager instead. Never open SSH to the entire internet.
7. Add CloudWatch logs/metrics/alarms and a backup/restore test.
8. Document the architecture, deployment steps, cost estimate, security controls and test evidence.

A public HTTPS deployment requires a domain name pointed at the host (or another supported HTTPS setup). Do not expose port 3000 directly as the final production endpoint. SQLite is suitable for a small single-instance learning demo; before scaling to multiple app instances, consider a managed database and a shared persistent session store.

## CI test workflow

GitHub Actions runs `npm test` using a temporary test database. The workflow does not deploy to AWS yet; cloud credentials and a deployment mechanism should only be added after the tests pass and IAM permissions have been designed with least privilege.

## Evidence to capture for the elective

- A successful GitHub Actions run.
- A Docker container running and passing its health check.
- Terraform plan/apply output with secrets redacted.
- A working HTTPS URL.
- CloudWatch logs and a tested alarm.
- A documented backup/restore or recovery test.
- A short architecture diagram and an explanation of trade-offs and costs.
