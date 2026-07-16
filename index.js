import 'react-native-get-random-values';
import { Buffer } from 'buffer';
// @ts-ignore
if (typeof global !== 'undefined' && !(global).Buffer) (global).Buffer = Buffer;

import { registerRootComponent } from 'expo';
import App from './App';
import './src/lib/offline/backgroundSyncTask';
registerRootComponent(App);
