import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const modulePath = resolve(
  'node_modules/dojah-kyc-sdk-react-expo/android/src/main/java/com/dojah/dojah_Kyc_rn_expo/DojahKycSdkReactExpoModule.kt',
);
const marker = 'TaskGrid native diagnostics';
let source = readFileSync(modulePath, 'utf8');
// npm packages may contain CRLF on Windows while the guarded replacements
// below intentionally use a single canonical newline format.
source = source.replace(/\r\n/g, '\n');

if (source.includes(marker)) {
  console.log('Dojah native diagnostics are already applied.');
  process.exit(0);
}

function replaceRequired(before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Could not apply Dojah diagnostic patch at ${label}. The SDK source changed.`);
  }
  source = source.replace(before, after);
}

replaceRequired(
  `            mPromise = promise
            val reactContext = appContext.reactContext`,
  `            mPromise = promise
            // TaskGrid native diagnostics. Never log identity data, email, keys or media.
            Log.i("TaskGridKycNative", "launch requested referenceSuffix=\${referenceId?.takeLast(8) ?: "none"}")
            val reactContext = appContext.reactContext`,
  'launch request',
);

replaceRequired(
  `            if (reactContext == null || activity == null)
                mPromise?.reject(CodedException("Activity does not exist"))`,
  `            if (reactContext == null || activity == null) {
                Log.e("TaskGridKycNative", "launch rejected because React context or activity is missing")
                mPromise?.reject(CodedException("Activity does not exist"))
            }`,
  'missing activity',
);

replaceRequired(
  `                    Log.d("DojahKycSdk", "data passed -> \${extraData?.toExtraUserData()}")`,
  `                    Log.i("TaskGridKycNative", "Dojah activity launch dispatched")`,
  'sensitive launch log',
);

replaceRequired(
  `                } catch (e: Exception) {
                    e.printStackTrace()
                    mPromise?.reject(CodedException("Error launching Dojah SDK"))`,
  `                } catch (e: Exception) {
                    Log.e("TaskGridKycNative", "Dojah launch threw \${e.javaClass.simpleName}: \${e.message}", e)
                    mPromise?.reject(CodedException("Error launching Dojah SDK"))`,
  'launch exception',
);

replaceRequired(
  `            val data = payload.data
            if (requestCode == BACKWARD_CALL_REQUEST_CODE) {`,
  `            val data = payload.data
            Log.i("TaskGridKycNative", "activity result requestCode=\$requestCode resultCode=\$resultCode hasData=\${data != null}")
            if (requestCode == BACKWARD_CALL_REQUEST_CODE) {`,
  'activity result',
);

replaceRequired(
  `                        val result = if (raw.isNullOrBlank()) DOJAH_CLOSED_RESULT else raw
                        mPromise?.resolve(result)`,
  `                        val result = if (raw.isNullOrBlank()) DOJAH_CLOSED_RESULT else raw
                        Log.i("TaskGridKycNative", "activity completed result=\$result")
                        mPromise?.resolve(result)`,
  'successful result',
);

replaceRequired(
  `                    Activity.RESULT_CANCELED -> {
                        // Back / system cancel before SDK set a result
                        mPromise?.resolve(DOJAH_CLOSED_RESULT)`,
  `                    Activity.RESULT_CANCELED -> {
                        // Back / system cancel before SDK set a result
                        Log.i("TaskGridKycNative", "activity cancelled before a provider result")
                        mPromise?.resolve(DOJAH_CLOSED_RESULT)`,
  'cancelled result',
);

writeFileSync(modulePath, source, 'utf8');
console.log('Applied TaskGrid native Dojah diagnostics.');
