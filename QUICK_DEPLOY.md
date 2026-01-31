# 🚀 Quick Deploy Cheat Sheet

## Deploy from Dev Machine
```bash
export GITHUB_CR_PAT='your_token'
cd /home/msawayda/GitHub/AdaptiveSoftware/Pass-The-Recipe
./deploy.sh "Your commit message"
```

## Deploy on Unraid (First Time)
```bash
# Login
echo 'YOUR_PAT' | docker login ghcr.io -u mikesawayda-adaptivesoftware --password-stdin

# Run
docker run -d --name pass-the-recipe --restart unless-stopped \
  -p 3084:3000 \
  -v /mnt/user/appdata/pass-the-recipe/data:/app/data \
  -v /mnt/user/appdata/pass-the-recipe/uploads:/app/uploads \
  -e JWT_SECRET='your-secret' \
  ghcr.io/mikesawayda-adaptivesoftware/pass-the-recipe:latest
```

## Update on Unraid
```bash
docker pull ghcr.io/mikesawayda-adaptivesoftware/pass-the-recipe:latest
docker rm -f pass-the-recipe
# (then run the docker run command above)
```

## Test Locally
```bash
docker build -t ptr:test .
docker run -d --name ptr-test -p 3084:3000 \
  -e JWT_SECRET='test' ptr:test
```

## Access
- **URL**: http://192.168.0.248:3084
- **Health**: http://192.168.0.248:3084/api

## Logs
```bash
docker logs -f pass-the-recipe
```
