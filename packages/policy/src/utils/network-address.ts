import { BlockList, isIP } from "node:net";

export const NetworkAddressKind = {
  PUBLIC: "public",
  PRIVATE: "private",
  RESERVED: "reserved",
  PROXY_FAKE: "proxy_fake",
} as const;

const privateNetworks = new BlockList();
const reservedNetworks = new BlockList();
const proxyNetworks = new BlockList();
const globalIpv6Networks = new BlockList();

for (const [network, prefix] of [
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
] as const)
  privateNetworks.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [
  ["::1", 128],
  ["fc00::", 7],
] as const)
  privateNetworks.addSubnet(network, prefix, "ipv6");
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["169.254.0.0", 16],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3],
] as const)
  reservedNetworks.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
] as const)
  reservedNetworks.addSubnet(network, prefix, "ipv6");
proxyNetworks.addSubnet("198.18.0.0", 15, "ipv4");
globalIpv6Networks.addSubnet("2000::", 3, "ipv6");

export function classifyNetworkAddress(
  address: string,
): (typeof NetworkAddressKind)[keyof typeof NetworkAddressKind] {
  const family = isIP(address);
  if (family === 0 || address.includes("%")) return NetworkAddressKind.RESERVED;
  const type = family === 6 ? "ipv6" : "ipv4";
  // Node BlockList 对 IPv4 子网同时检查 IPv4-mapped IPv6 地址。
  if (privateNetworks.check(address, type)) return NetworkAddressKind.PRIVATE;
  if (reservedNetworks.check(address, type)) return NetworkAddressKind.RESERVED;
  if (proxyNetworks.check(address, type)) return NetworkAddressKind.PROXY_FAKE;
  if (family === 6 && !globalIpv6Networks.check(address, type)) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
    return mapped === undefined ? NetworkAddressKind.RESERVED : classifyNetworkAddress(mapped);
  }
  return NetworkAddressKind.PUBLIC;
}
