// Bugsnag client placeholder - requires @bugsnag/js package to be installed
// For now, export a no-op client to prevent build errors

const bugsnagClient = {
  notify: (error: Error) => {
    console.error('Bugsnag not configured:', error);
  },
  leaveBreadcrumb: (message: string) => {
    console.log('Bugsnag breadcrumb:', message);
  },
};

export default bugsnagClient;
