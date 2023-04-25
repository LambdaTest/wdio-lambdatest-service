import * as LambdaTestTunnel from '@lambdatest/node-tunnel';
import type { Capabilities, Options } from '@wdio/types';

export interface LambdaTestLauncherOptions {
    tunnel?: boolean;
    lambdatestOpts?: LambdaTestTunnel.Options;
}

export default class LambdaTestLauncher {
    options: LambdaTestLauncherOptions;
    lambdatestTunnelProcess?: LambdaTestTunnel.Tunnel | undefined;
    constructor(options?: LambdaTestLauncherOptions);
    onPrepare(config?: Options.Testrunner, capabilities?: Capabilities.RemoteCapabilities): Promise<unknown>;
    onComplete(): Promise<void> | undefined;
}
