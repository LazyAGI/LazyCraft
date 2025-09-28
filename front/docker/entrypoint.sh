set -e

export FRONTEND_DEPLOY_STAGE=${BUILD_ENV}
export FRONTEND_CORE_API=${CORE_API_ENDPOINT}/console/api
export FRONTEND_APP_API=${APP_API_ENDPOINT}/api
export FRONTEND_ABOUT_URL=${SITE_ABOUT}

pm2 start ./pm2.json --no-daemon
