const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function afterSign(context) {
  if (process.platform !== 'darwin') return;
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);
  const entitlementsPath = path.join(__dirname, '..', 'entitlements.mac.plist');
  console.log(`[afterSign] Ad-hoc signing ${appPath} with identifier com.explorer2.app and entitlements...`);
  execFileSync('codesign', [
    '--force',
    '--deep',
    '--sign',
    '-',
    '--identifier',
    'com.explorer2.app',
    '--entitlements',
    entitlementsPath,
    appPath
  ], { stdio: 'inherit' });
};
