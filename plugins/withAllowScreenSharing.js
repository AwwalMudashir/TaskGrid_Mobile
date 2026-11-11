const { withMainActivity } = require('expo/config-plugins');

const IMPORT = 'import android.view.WindowManager';
const START_MARKER = '// @taskgrid-screen-sharing begin';
const END_MARKER = '// @taskgrid-screen-sharing end';

module.exports = function withAllowScreenSharing(config) {
  return withMainActivity(config, (activityConfig) => {
    if (activityConfig.modResults.language !== 'kt') return activityConfig;

    let contents = activityConfig.modResults.contents;
    if (!contents.includes(IMPORT)) {
      contents = contents.replace('import android.os.Bundle', `import android.os.Bundle\n${IMPORT}`);
    }

    if (!contents.includes('allowScreenSharing()')) {
      contents = contents.replace('super.onCreate(null)', 'super.onCreate(null)\n    allowScreenSharing()');
    }

    if (!contents.includes(START_MARKER)) {
      const sharingMethods = `
  ${START_MARKER}
  override fun onResume() {
    super.onResume()
    // TaskGrid permits screen sharing, including on the sign-in screen.
    allowScreenSharing()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) allowScreenSharing()
  }

  private fun allowScreenSharing() {
    window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
  }
  ${END_MARKER}

`;
      contents = contents.replace(
        '  override fun createReactActivityDelegate()',
        `${sharingMethods}  override fun createReactActivityDelegate()`,
      );
    }

    activityConfig.modResults.contents = contents;
    return activityConfig;
  });
};
