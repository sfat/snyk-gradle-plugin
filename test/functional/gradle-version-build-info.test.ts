import {test} from 'tap';
import {exportsForTests as testableMethods} from '../../lib';

test('should extract gradle -v output info', async (t) => {
  const expectedGradleOutput = '\n' +
      '------------------------------------------------------------\n' +
      'Gradle 4.10.3\n' +
      '------------------------------------------------------------\n' +
      '\n' +
      'Build time:   2018-12-05 00:50:54 UTC\n' +
      'Revision:     e76905e3a1034e6f724566aeb985621347ff43bc\n' +
      '\n' +
      'Kotlin DSL:   1.0-rc-6\n' +
      'Kotlin:       1.2.61\n' +
      'Groovy:       2.4.15\n' +
      'Ant:          Apache Ant(TM) version 1.9.11 compiled on March 23 2018\n' +
      'JVM:          1.8.0_222 (Eclipse OpenJ9 openj9-0.15.1)\n' +
      'OS:           Mac OS X 10.14.6 x86_64';
  const versionBuildInfo = testableMethods.getVersionBuildInfo(expectedGradleOutput);
  t.equal(versionBuildInfo.gradleVersion, '4.10.3', 'returns correct gradle version');
  t.equal(versionBuildInfo.metaBuildVersion.buildTime, '2018-12-05 00:50:54 UTC', 'returns build time');
  t.equal(versionBuildInfo.metaBuildVersion.revision, 'e76905e3a1034e6f724566aeb985621347ff43bc', 'returns revision');
  t.equal(versionBuildInfo.metaBuildVersion.kotlinDsl, '1.0-rc-6', 'returns Kotlin DSL version');
  t.equal(versionBuildInfo.metaBuildVersion.kotlin, '1.2.61', 'returns Kotlin version');
  t.equal(versionBuildInfo.metaBuildVersion.groovy, '2.4.15', 'returns groovy version');
  t.equal(versionBuildInfo.metaBuildVersion.ant, 'Apache Ant(TM) version 1.9.11 compiled on March 23 2018', 'returns ant version');
  t.equal(versionBuildInfo.metaBuildVersion.jvm, '1.8.0_222 (Eclipse OpenJ9 openj9-0.15.1)', 'returns jvm version');
  t.equal(versionBuildInfo.metaBuildVersion.os, 'Mac OS X 10.14.6 x86_64', 'returns OS');
});
