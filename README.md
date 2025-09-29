<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/18Q7Cp-pWSI1k4SecsXR0A9tTHZSE3O4r

Colors:
Purple: #4309CA
Orange: #00DBF8
## Run Locally

Usage:

For production:
`docker build --target production -t cubel-cloud:prod .`
`docker run -p 8080:80 cubel-cloud:prod`

For development:
`docker build --target development -t cubel-cloud:dev .`
`docker run -p 3000:3000 cubel-cloud:dev`