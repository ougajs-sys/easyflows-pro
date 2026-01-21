import Bugsnag from '@bugsnag/js';

Bugsnag.start({
    apiKey: 'YOUR_API_KEY',
    appVersion: '1.0.0',
    releaseStage: 'production',
    notifyReleaseStages: ['production', 'staging'],
    enabledReleaseStages: ['production', 'staging'],
    onError: (event) => {
        // Customize the error event before it is sent to Bugsnag
        event.addMetadata('user', {
            // Custom user metadata
        });
    }
});

export default Bugsnag;