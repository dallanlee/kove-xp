import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('weekly', 'routes/weekly.tsx'),
  route('bank', 'routes/bank.tsx'),
  route('parent', 'routes/parent.tsx'),
  route('login', 'routes/login.tsx'),
] satisfies RouteConfig
