import config from './playwright.config'
export default { ...config, use: { ...config.use, baseURL: 'http://localhost:5198' }, webServer: { command: 'npm run dev -- --port 5198 --strictPort', url: 'http://localhost:5198', reuseExistingServer: false, timeout: 60000 } }
