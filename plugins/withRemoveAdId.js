// plugins/withRemoveAdId.js
//
// The DealNux app does NOT use the Google Advertising ID. The Facebook SDK
// auto-merges the AD_ID permissions into the manifest, which forces a Play
// Console "advertising ID" declaration. We strip them here.
//
// This was previously done by hand-editing android/app/src/main/AndroidManifest.xml,
// but EAS Build runs a fresh `prebuild` in the cloud that regenerates the manifest
// and drops that manual edit — so the AAB shipped WITH the AD_ID permission. As a
// config plugin this runs on every prebuild, keeping every build free of AD_ID so
// the Play Console declaration can stay "No". It does not change app behaviour.

const { withAndroidManifest } = require('@expo/config-plugins');

const AD_ID_PERMISSIONS = [
  'com.google.android.gms.permission.AD_ID',
  'android.permission.ACCESS_ADSERVICES_AD_ID',
];

module.exports = function withRemoveAdId(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Make sure the tools namespace exists so tools:node works.
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] =
      manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';

    manifest['uses-permission'] = manifest['uses-permission'] || [];

    // Drop any real AD_ID permission entries...
    manifest['uses-permission'] = manifest['uses-permission'].filter(
      (perm) => !AD_ID_PERMISSIONS.includes(perm.$?.['android:name'])
    );

    // ...and add explicit tools:node="remove" markers so SDK-merged copies are
    // stripped during manifest merging.
    for (const name of AD_ID_PERMISSIONS) {
      manifest['uses-permission'].push({
        $: { 'android:name': name, 'tools:node': 'remove' },
      });
    }

    return config;
  });
};
