import { networkInterfaces } from 'node:os';

export function photoShareUrl(request, assetPath, publicOrigin = '', interfaces = networkInterfaces()) {
  const origin = new URL(publicOrigin || `${request.protocol}://${request.get('host')}`);
  if (!publicOrigin && ['localhost','127.0.0.1','[::1]'].includes(origin.hostname)) {
    const addresses = Object.values(interfaces).flat().filter(a => a && !a.internal && a.family === 'IPv4');
    const lan = addresses.find(a => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address));
    if (lan) origin.hostname = lan.address;
  }
  return new URL(assetPath, origin).href;
}
