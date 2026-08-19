/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@engineering-playbook/ui",
    "@engineering-playbook/content",
    "@engineering-playbook/content-schema",
    "@engineering-playbook/shared-types",
  ],
};

module.exports = nextConfig;
