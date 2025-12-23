import type { Config } from "@react-router/dev/config";

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  // For S3 static hosting, we need SPA mode
  ssr: false,
} satisfies Config;
