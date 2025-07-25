#!/bin/bash

# UAE Delivery Management System - Kubernetes Deployment Script
# This script deploys the complete delivery management system to Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="delivery-management"
DOMAIN="your-domain.ae"
KUBECTL_CONTEXT=""  # Set this if you have multiple contexts

echo -e "${BLUE}🚀 Starting UAE Delivery Management System Kubernetes Deployment${NC}"
echo "================================================================"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to wait for deployment to be ready
wait_for_deployment() {
    local deployment=$1
    local namespace=$2
    echo "Waiting for deployment $deployment to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/$deployment -n $namespace
    if [ $? -eq 0 ]; then
        print_status "Deployment $deployment is ready"
    else
        print_error "Deployment $deployment failed to become ready"
        exit 1
    fi
}

# Function to wait for pods to be ready
wait_for_pods() {
    local label=$1
    local namespace=$2
    echo "Waiting for pods with label $label to be ready..."
    kubectl wait --for=condition=ready pod -l $label -n $namespace --timeout=300s
    if [ $? -eq 0 ]; then
        print_status "Pods with label $label are ready"
    else
        print_error "Pods with label $label failed to become ready"
        exit 1
    fi
}

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if we can connect to Kubernetes cluster
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

print_status "Prerequisites check passed"

# Set kubectl context if specified
if [ ! -z "$KUBECTL_CONTEXT" ]; then
    kubectl config use-context $KUBECTL_CONTEXT
    print_status "Using kubectl context: $KUBECTL_CONTEXT"
fi

# Prompt for domain configuration
echo -e "${YELLOW}Please enter your domain name (default: your-domain.ae):${NC}"
read -r user_domain
if [ ! -z "$user_domain" ]; then
    DOMAIN=$user_domain
fi

echo -e "${BLUE}Using domain: $DOMAIN${NC}"

# Update configuration files with the correct domain
echo -e "${BLUE}📝 Updating configuration files...${NC}"
sed -i.bak "s/your-domain\.ae/$DOMAIN/g" k8s/ingress.yaml
sed -i.bak "s/your-domain\.ae/$DOMAIN/g" k8s/monitoring.yaml
print_status "Configuration files updated"

# Step 1: Create namespace
echo -e "${BLUE}📦 Creating namespace...${NC}"
kubectl apply -f k8s/namespace.yaml
print_status "Namespace created"

# Step 2: Create secrets (WARNING: Update with real secrets before production!)
echo -e "${BLUE}🔐 Creating secrets...${NC}"
print_warning "WARNING: Please update secrets.yaml with real production secrets before deployment!"
echo "Current secrets are base64 encoded defaults and should be changed for production use."
read -p "Press Enter to continue with default secrets (NOT recommended for production)..."

kubectl apply -f k8s/secrets.yaml
print_status "Secrets created"

# Step 3: Create ConfigMaps
echo -e "${BLUE}⚙️  Creating ConfigMaps...${NC}"
kubectl apply -f k8s/configmap.yaml
print_status "ConfigMaps created"

# Step 4: Deploy PostgreSQL
echo -e "${BLUE}🗄️  Deploying PostgreSQL database...${NC}"
kubectl apply -f k8s/postgres.yaml
wait_for_deployment "postgres" $NAMESPACE
wait_for_pods "app=postgres" $NAMESPACE
print_status "PostgreSQL deployed successfully"

# Step 5: Deploy Redis
echo -e "${BLUE}💾 Deploying Redis cache...${NC}"
kubectl apply -f k8s/redis.yaml
wait_for_deployment "redis" $NAMESPACE
wait_for_pods "app=redis" $NAMESPACE
print_status "Redis deployed successfully"

# Step 6: Deploy Backend API
echo -e "${BLUE}🔧 Deploying Backend API...${NC}"
kubectl apply -f k8s/backend.yaml
wait_for_deployment "backend" $NAMESPACE
wait_for_pods "app=backend" $NAMESPACE
print_status "Backend API deployed successfully"

# Step 7: Deploy PWA Applications
echo -e "${BLUE}📱 Deploying PWA Applications...${NC}"
kubectl apply -f k8s/pwas.yaml

# Wait for each PWA deployment
wait_for_deployment "public-pwa" $NAMESPACE
wait_for_deployment "admin-pwa" $NAMESPACE
wait_for_deployment "business-pwa" $NAMESPACE
wait_for_deployment "driver-pwa" $NAMESPACE

wait_for_pods "app=public-pwa" $NAMESPACE
wait_for_pods "app=admin-pwa" $NAMESPACE
wait_for_pods "app=business-pwa" $NAMESPACE
wait_for_pods "app=driver-pwa" $NAMESPACE

print_status "PWA Applications deployed successfully"

# Step 8: Deploy Monitoring Stack
echo -e "${BLUE}📊 Deploying Monitoring Stack...${NC}"
kubectl apply -f k8s/monitoring.yaml

wait_for_deployment "prometheus" $NAMESPACE
wait_for_deployment "grafana" $NAMESPACE
wait_for_deployment "alertmanager" $NAMESPACE

wait_for_pods "app=prometheus" $NAMESPACE
wait_for_pods "app=grafana" $NAMESPACE
wait_for_pods "app=alertmanager" $NAMESPACE

print_status "Monitoring stack deployed successfully"

# Step 9: Deploy Ingress
echo -e "${BLUE}🌐 Deploying Ingress...${NC}"
kubectl apply -f k8s/ingress.yaml
print_status "Ingress deployed successfully"

# Step 10: Verify deployment
echo -e "${BLUE}✅ Verifying deployment...${NC}"

# Check all deployments
echo "Checking deployment status..."
kubectl get deployments -n $NAMESPACE

# Check all services
echo "Checking service status..."
kubectl get services -n $NAMESPACE

# Check all pods
echo "Checking pod status..."
kubectl get pods -n $NAMESPACE

# Check ingress
echo "Checking ingress status..."
kubectl get ingress -n $NAMESPACE

# Step 11: Display access information
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo "================================================================"
echo -e "${BLUE}Access URLs:${NC}"
echo "🌐 Public Site: https://$DOMAIN"
echo "👨‍💼 Admin Portal: https://admin.$DOMAIN"
echo "🏢 Business Portal: https://business.$DOMAIN"
echo "🚚 Driver App: https://driver.$DOMAIN"
echo "🔧 API Endpoint: https://api.$DOMAIN"
echo ""
echo -e "${BLUE}Monitoring URLs:${NC}"
echo "📊 Grafana: https://monitoring.$DOMAIN (admin/admin123)"
echo "🔍 Prometheus: https://prometheus.$DOMAIN"
echo "🚨 Alertmanager: https://alerts.$DOMAIN"
echo ""
echo -e "${BLUE}Database Access:${NC}"
echo "🗄️  PostgreSQL: postgres-service.$NAMESPACE.svc.cluster.local:5432"
echo "💾 Redis: redis-service.$NAMESPACE.svc.cluster.local:6379"
echo ""

# Step 12: Post-deployment instructions
echo -e "${YELLOW}📋 Post-deployment tasks:${NC}"
echo "1. Update DNS records to point to your cluster's load balancer IP"
echo "2. Configure SSL certificates (Let's Encrypt recommended)"
echo "3. Update secrets.yaml with production secrets and redeploy"
echo "4. Run database migrations:"
echo "   kubectl exec -it deployment/backend -n $NAMESPACE -- npm run migrate:up"
echo "5. Seed initial data:"
echo "   kubectl exec -it deployment/backend -n $NAMESPACE -- npm run seed:production"
echo "6. Configure monitoring alerts in Grafana"
echo "7. Set up backup procedures for PostgreSQL and file uploads"
echo "8. Configure log aggregation (ELK stack or similar)"
echo "9. Run security scans and penetration testing"
echo "10. Set up monitoring and alerting for your team"
echo ""

# Step 13: Get cluster information
echo -e "${BLUE}🔍 Cluster Information:${NC}"
LOAD_BALANCER_IP=$(kubectl get service -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Not available")
if [ "$LOAD_BALANCER_IP" != "Not available" ]; then
    echo "Load Balancer IP: $LOAD_BALANCER_IP"
    echo "Point your DNS A records to this IP address"
else
    echo "Load Balancer IP not yet assigned. Check with:"
    echo "kubectl get service -n ingress-nginx ingress-nginx-controller"
fi

echo ""
echo -e "${GREEN}✨ UAE Delivery Management System is now deployed and ready to serve!${NC}"
echo ""
echo -e "${YELLOW}💡 Need help? Check the logs with:${NC}"
echo "kubectl logs -f deployment/backend -n $NAMESPACE"
echo "kubectl logs -f deployment/public-pwa -n $NAMESPACE"
echo ""
echo -e "${YELLOW}🔧 Scale deployments with:${NC}"
echo "kubectl scale deployment/backend --replicas=5 -n $NAMESPACE"
echo ""
echo -e "${YELLOW}📊 Monitor with:${NC}"
echo "kubectl top pods -n $NAMESPACE"
echo "kubectl get hpa -n $NAMESPACE"
echo ""

# Cleanup backup files
rm -f k8s/*.bak

echo -e "${BLUE}Deployment script completed successfully! 🎊${NC}"