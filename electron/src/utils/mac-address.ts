import { networkInterfaces } from 'os';

export async function getMacAddress(): Promise<string> {
    try {
        const nets = networkInterfaces();
        const results: { [key: string]: string[] } = {};

        for (const [name, netInterfaces] of Object.entries(nets)) {
            if (!netInterfaces) continue;
            
            for (const net of netInterfaces) {
                // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
                if (net.family === 'IPv4' && !net.internal) {
                    if (!results[name]) {
                        results[name] = [];
                    }
                    results[name].push(net.mac);
                }
            }
        }

        // Try to get the first non-empty MAC address
        for (const [_, macs] of Object.entries(results)) {
            if (macs && macs.length > 0 && macs[0] && macs[0] !== '00:00:00:00:00:00') {
                return macs[0];
            }
        }

        // Fallback to a default value if no valid MAC address found
        return '00:00:00:00:00:00';
    } catch (error) {
        console.error('Error getting MAC address:', error);
        return '00:00:00:00:00:00';
    }
}
