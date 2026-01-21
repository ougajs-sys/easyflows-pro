import Bugsnag from '@bugsnag/js';

const bugsnagClient = Bugsnag.createClient({
  apiKey: process.env.VITE_BUGSNAG_API_KEY,
});

export default bugsnagClient;
