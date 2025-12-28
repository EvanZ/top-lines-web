sudo cp -r ~/top-lines/top-lines-web/frontend/dist/* ~/top-lines/top-lines-web/frontend/dist_old
npm run build
sudo cp -r ~/top-lines/top-lines-web/frontend/dist/* /var/www/top-lines
