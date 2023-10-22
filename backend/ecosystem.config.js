module.exports = {
	apps: [
		{
			name: 'webgpu-racing-game',
			script: './dist/index.js'
		}
	],
	deploy: {
		production: {
			user: 'tmp1',
			host: [{ host: '91.228.198.103', port: '6666' }],
			ref: 'origin/main', // Branch you want to deploy
			repo: 'git@github.com:iwoplaza/uni-web-gpu-racing-game.git',
			path: '/home/tmp1/web-gpu-project', // Where to put the project on the server
			'post-deploy':
				'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
			key: './key.pem'
		}
	}
};
