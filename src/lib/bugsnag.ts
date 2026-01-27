// Bugsnag client placeholder - requires @bugsnag/js package to be installed
// For now, export a no-op client to prevent build errors

interface BugsnagEvent {
  context?: string;
  addMetadata: (section: string, data: Record<string, unknown>) => void;
}

const bugsnagClient = {
  notify: (error: Error, onError?: (event: BugsnagEvent) => void) => {
    console.error('Bugsnag not configured:', error);
    if (onError) {
      const mockEvent: BugsnagEvent = {
        addMetadata: (section, data) => {
          console.log(`Bugsnag metadata [${section}]:`, data);
        },
      };
      onError(mockEvent);
    }
  },
  leaveBreadcrumb: (message: string) => {
    console.log('Bugsnag breadcrumb:', message);
  },
};

export default bugsnagClient;
