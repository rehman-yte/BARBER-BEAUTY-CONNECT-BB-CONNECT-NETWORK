# PERMANENT INTERFACE FREEZE DIRECTIVE

To maintain secure, zero-overhead execution:
1. **NO UI MODIFICATIONS**:
   - The Customer Dashboard (`src/pages/CustomerDashboard.tsx`) is 100% frozen.
   - The Partner Dashboard (`src/pages/PartnerDashboard.tsx`) is 100% frozen.
   - All Administrative portals and layouts are 100% frozen.
2. **INFRASTRUCTURE INTEGRITY**:
   - Vite is configured to produce modern, highly optimized ESM targets (`esnext` / `format: 'esm'`) to resolve runtime `import.meta` warnings and allow frictionless automatic build procedures on Vercel.
   - Do not override build output target module setups.
