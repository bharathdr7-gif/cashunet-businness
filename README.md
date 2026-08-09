# Cashew Store

A complete starter e-commerce application for a cashew-selling business.

## Stack

- Frontend: React + Vite
- Backend: Python + FastAPI
- Database: MongoDB
- Containers: Docker
- Orchestration: Kubernetes
- CI/CD: GitHub Actions
- Container registry: GitHub Container Registry (docker)

## Features

### Customer
- Mobile-number login
- Demo OTP login (`123456`)
- Product listing
- Product details
- Add to cart
- Checkout
- COD order creation
- My orders
- Order status

### Admin
- Product creation
- Product listing
- Order listing
- Update order status

## Project structure

```text
cashew-store/
├── backend/
├── frontend/
├── k8s/
├── .github/workflows/
├── docker-compose.yml
└── README.md
```

## Run locally with Docker Compose

```bash
docker compose up --build
```

Frontend:
http://localhost:3000

Backend:
http://localhost:8000

API documentation:
http://localhost:8000/docs

MongoDB:
mongodb://localhost:27017

Demo login:
- Any 10-digit mobile number
- OTP: `123456`

## Kubernetes

The manifests deploy:
- MongoDB
- Backend
- Frontend
- Services
- Ingress

Build and push images manually:

```bash
docker build -t docker.io/YOUR_GITHUB_USER/cashew-backend:latest ./backend
docker build -t docker.io/YOUR_GITHUB_USER/cashew-frontend:latest ./frontend

docker push docker.io/YOUR_GITHUB_USER/cashew-backend:latest
docker push docker.io/YOUR_GITHUB_USER/cashew-frontend:latest
```

Update the image names in:

```text
k8s/backend-deployment.yaml
k8s/frontend-deployment.yaml
```

Then:

```bash
kubectl apply -f k8s/
kubectl get pods
kubectl get svc
kubectl get ingress
```

## GitHub Actions

The workflow builds both Docker images, pushes them to docker, and deploys the Kubernetes manifests.

Required GitHub repository secrets:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_EKS_CLUSTER_NAME
```

The workflow uses AWS credentials to authenticate and run `aws eks update-kubeconfig` for the target EKS cluster.

The workflow also uses GitHub's built-in `GITHUB_TOKEN` to push to docker.

For a private docker package, create a Kubernetes image pull secret and reference it in the deployments.

## Production notes

This repository intentionally keeps the first version simple:
- No Redis
- No payment gateway
- No SMS provider
- No external authentication provider
- No separate microservices

Before production, replace demo OTP with a real SMS/OTP provider, use managed MongoDB, add proper authentication/JWT/refresh tokens, HTTPS, secrets management, payment integration, validation, monitoring, backups, and proper inventory transactions.
