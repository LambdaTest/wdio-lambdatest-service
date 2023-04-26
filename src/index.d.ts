import LambdaTestLauncher from './launcher.js';
import LambdaRestService from './service.js';
import { LTOptions, SessionNameOptions } from './types.js';
export default LambdaRestService;
export declare const launcher: typeof LambdaTestLauncher;
export * from './types.js';
declare global {
    namespace WebdriverIO {
        interface ServiceOption extends LTOptions, SessionNameOptions {}
    }
}
