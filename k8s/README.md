# Kubernetes deployment

## 1. Install NGINX Ingress Controller

If your cluster does not already have one:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller/main/deploy/static/provider/cloud/deploy.yaml
```

## 2. Change image owner

Edit these files if deploying manually:

```text
backend-deployment.yaml
frontend-deployment.yaml
```

Replace:

```text
YOUR_GITHUB_USER
```

with your GitHub username.

## 3. Deploy

```bash
kubectl apply -k .
```

Check:

```bash
kubectl get pods -n cashew-store
kubectl get svc -n cashew-store
kubectl get ingress -n cashew-store
```

## 4. Local testing

For a quick test without an AWS load balancer:

```bash
kubectl port-forward svc/frontend 8080:80 -n cashew-store
```

Open:

```text
http://localhost:8080
```

The frontend uses `/api` and the ingress routes `/api` to the backend.

## Important

MongoDB here is deployed inside Kubernetes only to make this project self-contained. For production, use MongoDB Atlas or another managed MongoDB service and configure credentials using Kubernetes Secrets.
