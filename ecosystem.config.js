// PM2 config - start with:  pm2 start ecosystem.config.js
// Pair the number ONCE first (PM2 cannot ask questions):  npm run terminal   (wait for "Connected", CTRL+C)
// Then:  pm2 start ecosystem.config.js  &&  pm2 save  &&  pm2 startup   (Linux)
module.exports = {
  apps: [{
    name: 'awais-x-md',
    script: 'index.js',
    cwd: __dirname,
    autorestart: true,
    max_restarts: 50,
    min_uptime: '30s',            // a start that dies in under 30s counts as a crash (not as a healthy run)
    restart_delay: 5000,
    stop_exit_codes: [0, 2],      // 0 = normal stop, 2 = config error: do not restart in a loop
    max_memory_restart: '1G',            // Telegram / Web mode run many numbers in one process (about 70-100 MB each)
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    time: true
  }]
};
