#!/bin/bash

# Server Setup Script for Fresh Ubuntu KVM VPS
set -e

echo "🔧 Setting up Ubuntu server for GRS Delivery System..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential tools
echo "🛠️ Installing essential tools..."
sudo apt install -y curl wget git vim htop unzip software-properties-common

# Install Node.js (latest LTS)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
echo "📦 Installing pnpm..."
npm install -g pnpm

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Setup firewall
echo "🔥 Setting up firewall..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000:3004/tcp
sudo ufw --force enable

# Create app directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/grs-delivery
sudo chown $USER:$USER /opt/grs-delivery

# Setup nginx (basic)
echo "🌐 Installing nginx..."
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

echo "✅ Server setup completed!"
echo
echo "Next steps:"
echo "1. Clone your repository to /opt/grs-delivery"
echo "2. Run the deploy.sh script"
echo "3. Configure your domain DNS to point to this server"
echo
echo "Important: Log out and log back in for Docker group changes to take effect"