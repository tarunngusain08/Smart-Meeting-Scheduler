## Rebuild locally (no cache) and confirm image ID and copy to VM
```bash

docker build --no-cache --platform=linux/amd64 -t sms-single:latest \
  --build-arg VITE_BACKEND_URL=https://dismally-cosmographic-krystal.ngrok-free.dev \
  --build-arg VITE_CHAT_API_URL="https://shreeradhe.app.n8n.cloud/webhook/handle-user-prompt" \
  --build-arg VITE_AVATAR_API_URL="https://api.dicebear.com/7.x/avataaars/svg" \
  .

docker image inspect sms-single:latest --format 'ID: {{.Id}}  Created: {{.Created}}'

docker save sms-single:latest -o sms-single.tar
scp sms-single.tar radhey@20.64.238.178:~/backend/
```

## On the VM: confirm the file and load it, then inspect image ID

```bash
# on VM
docker rm -f sms || true
ls -lh ~/backend/sms-single.tar

# load the image (this will create the image locally)
docker load < ~/backend/sms-single.tar

# list the image and inspect to confirm the same ID/created time as your local build
docker image inspect sms-single:latest --format 'ID: {{.Id}}  Created: {{.Created}}'

```

## Remove old containers/images and run the new image
```bash
# stop & remove any old container named sms
docker rm -f sms || true

# optionally remove dangling older image with the same tag to avoid ambiguity
# (only do this if you are sure)
docker images --filter=reference='sms-single' --format '{{.Repository}} {{.Tag}} {{.ID}} {{.CreatedSince}}'
# remove older image ID if present:
# docker rmi <old-image-id>

# run the freshly loaded image
docker run -d --name sms -p 8080:8080 --env-file /home/radhey/backend/.env sms-single:latest

# follow logs
docker logs -f sms
```