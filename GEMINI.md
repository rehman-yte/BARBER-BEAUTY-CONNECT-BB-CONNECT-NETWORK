# PERMANENT INTERFACE FREEZE DIRECTIVE

To maintain secure, zero-overhead execution:
1. **PERMANENT LOCK FOR PARTNER & ADMIN**:
   - The Partner Dashboard (`src/pages/PartnerDashboard.tsx`) and Onboarding (`src/pages/PartnerOnboarding.tsx`) are 100% frozen and locked.
   - All Administrative portals, shops management, and layouts are 100% frozen and locked.
   - Do not alter, inspect, or modify Partner or Admin portals.
2. **INFRASTRUCTURE INTEGRITY**:
   - Vite is configured to produce modern, highly optimized ESM targets (`esnext` / `format: 'esm'`) to resolve runtime `import.meta` warnings and allow frictionless automatic build procedures on Vercel.
   - Do not override build output target module setups.
