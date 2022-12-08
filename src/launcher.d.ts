import * as LambdaTestTunnel from '@lambdatest/node-tunnel';
import type { Capabilities, Services, Options } from '@wdio/types';
import type { BrowserstackConfig, App, AppConfig, AppUploadResponse } from './types';

export interface LambdaTestLauncherOptions {
    tunnel?: boolean;
    lambdatestOpts?: LambdaTestTunnel.Options
}

export default class LambdaTestLauncher {
    options: LambdaTestLauncherOptions;
    lambdatestTunnelProcess?: LambdaTestTunnel.Tunnel | undefined;
    constructor(options?: LambdaTestLauncherOptions);
    onPrepare(config?: Options.Testrunner, capabilities?: Capabilities.RemoteCapabilities): Promise<unknown>;
    onComplete(): Promise<void> | undefined;
}

export {};
