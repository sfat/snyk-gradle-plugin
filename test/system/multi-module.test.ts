import * as path from 'path';
import {fixtureDir} from '../common';
import {test} from 'tap';
import {inspect} from '../../lib';
import { legacyPlugin as api } from '@snyk/cli-interface';

test('multi-project, explicitly targeting a subproject build file', async (t) => {
  const result = await inspect('.',
    path.join(fixtureDir('multi-project'), 'subproj', 'build.gradle'));
  t.equals(result.package.name, '.',
      'root project is "."');
  t.equals(result.meta!.gradleProjectName, 'subproj',
    'root project is "subproj"');
  t.deepEqual(result.plugin.meta!.allSubProjectNames, ['subproj']);

  t.equal(result.package
    .dependencies!['com.android.tools.build:builder']
    .dependencies!['com.android.tools:sdklib']
    .dependencies!['com.android.tools:repository']
    .dependencies!['com.android.tools:common']
    .dependencies!['com.android.tools:annotations'].version,
  '25.3.0',
  'correct version found');
});

test('multi-project, ran from root, targeting subproj', async (t) => {
  const result = await inspect(
    fixtureDir('multi-project'),
    'subproj/build.gradle');
  t.equals(result.package.name, 'multi-project',
    'root project is "multi-project"');
  t.equals(result.meta!.gradleProjectName, 'subproj',
      'new root project is "subproj"');
  t.deepEqual(result.plugin.meta!.allSubProjectNames, ['subproj']);

  t.equal(result.package
    .dependencies!['com.android.tools.build:builder']
    .dependencies!['com.android.tools:sdklib']
    .dependencies!['com.android.tools:repository']
    .dependencies!['com.android.tools:common']
    .dependencies!['com.android.tools:annotations'].version,
  '25.3.0',
  'correct version found');
});

test('multi-project, ran from a subproject directory', async (t) => {
  const result = await inspect(
    path.join(fixtureDir('multi-project'), 'subproj'),
    'build.gradle');
  t.equals(result.package.name, 'subproj',
    'root project is "subproj"');
  t.deepEqual(result.plugin.meta!.allSubProjectNames, ['subproj']);

  t.equal(result.package
    .dependencies!['com.android.tools.build:builder']
    .dependencies!['com.android.tools:sdklib']
    .dependencies!['com.android.tools:repository']
    .dependencies!['com.android.tools:common']
    .dependencies!['com.android.tools:annotations'].version,
  '25.3.0',
  'correct version found');
});

test('multi-project: only sub-project has deps and they are returned', async (t) => {
  const options = {
    subProject: 'subproj',
  };
  const result = await inspect('.',
    path.join(fixtureDir('multi-project'), 'build.gradle'),
    options);
  t.match(result.package.name, '/subproj',
    'sub project name is included in the root pkg name');
  t.deepEqual(result.plugin.meta!.allSubProjectNames, ['root-proj', 'subproj']);

  t.equal(result.package
    .dependencies!['com.android.tools.build:builder']
    .dependencies!['com.android.tools:sdklib']
    .dependencies!['com.android.tools:repository']
    .dependencies!['com.android.tools:common']
    .dependencies!['com.android.tools:annotations'].version,
  '25.3.0',
  'correct version found');
});

test('multi-project: only sub-project has deps, none returned for main', async (t) => {
  const result = await inspect('.',
    path.join(fixtureDir('multi-project'), 'build.gradle'));
  t.match(result.package.name, '.',
    'returned project name is not sub-project');
  t.match(result.meta!.gradleProjectName, 'root-proj',
      'returned new project name is not sub-project');
  t.deepEqual(result.plugin.meta!.allSubProjectNames, ['root-proj', 'subproj']);
  t.notOk(result.package.dependencies);
});

test('multi-project: using gradle via wrapper', async (t) => {
  const result = await inspect('.',
    path.join(fixtureDir('multi-project gradle wrapper'), 'build.gradle'));
  t.match(result.package.name, '.',
    'returned project name is not sub-project');
  t.match(result.meta!.gradleProjectName, 'root-proj',
      'returned project name is not sub-project');
  t.equal(result.meta!.versionBuildInfo!.gradleVersion, '5.4.1');
  t.deepEqual(result.plugin.meta!.allSubProjectNames, ['root-proj', 'subproj']);
  t.notOk(result.package.dependencies);
});

test('multi-project: parallel is handled correctly', async (t) => {
  // Note: Gradle has to be run from the directory with `gradle.properties` to pick that one up
  const result = await inspect(fixtureDir('multi-project-parallel'), 'build.gradle');
  t.match(result.package.name, 'multi-project-parallel', 'expected project name');
  t.match(result.meta!.gradleProjectName, 'root-proj',
      'expected new project name');
  t.ok(result.package.dependencies);
});

test('multi-project: only sub-project has deps and they are returned space needs trimming', async (t) => {
  const options = {
    subProject: 'subproj ',
  };
  const result = await inspect('.',
    path.join(fixtureDir('multi-project'), 'build.gradle'),
    options);

  t.deepEqual(result.plugin.meta!.allSubProjectNames, ['root-proj', 'subproj']);

  t.match(result.package.name, '/subproj',
    'sub project name is included in the root pkg name');

  t.equal(result.package
    .dependencies!['com.android.tools.build:builder']
    .dependencies!['com.android.tools:sdklib']
    .dependencies!['com.android.tools:repository']
    .dependencies!['com.android.tools:common']
    .dependencies!['com.android.tools:annotations'].version,
  '25.3.0',
  'correct version found');
});

test('multi-project: deps for both projects are returned with allSubProjects flag', async (t) => {
  const result = await inspect('.',
    path.join(fixtureDir('multi-project'), 'build.gradle'), {allSubProjects: true});
  // It's an array, so we have to scan
  t.equal(result.scannedProjects.length, 2);
  for (const p of result.scannedProjects) {
    if (p.depTree.name === '.') {
      t.equal(p.meta!.gradleProjectName, 'root-proj', 'new project name');
      t.notOk(p.depTree.dependencies, 'no dependencies for the main depRoot');
      t.notOk(p.targetFile, 'no target file returned'); // see targetFileFilteredForCompatibility
      // TODO(kyegupov): when the project name issue is solved, change the assertion to:
      // t.match(p.targetFile, 'multi-project' + dirSep + 'build.gradle', 'correct targetFile for the main depRoot');
    } else {
      t.equal(p.depTree.name, './subproj',
        'sub project name is included in the root pkg name');
      t.equal(p.meta!.gradleProjectName, 'root-proj/subproj',
        'new sub project name is included in the root pkg name');
      t.equal(p.depTree
        .dependencies!['com.android.tools.build:builder']
        .dependencies!['com.android.tools:sdklib']
        .dependencies!['com.android.tools:repository']
        .dependencies!['com.android.tools:common']
        .dependencies!['com.android.tools:annotations'].version,
      '25.3.0',
      'correct version found');
      t.notOk(p.targetFile, 'no target file returned'); // see targetFileFilteredForCompatibility
      // TODO(kyegupov): when the project name issue is solved, change the assertion to:
      // t.match(p.targetFile, 'subproj' + dirSep + 'build.gradle', 'correct targetFile for the main depRoot');
    }
  }
});

test('single-project: array of one is returned with allSubProjects flag', async (t) => {
  const result = await inspect('.',
    path.join(fixtureDir('api-configuration'), 'build.gradle'), {allSubProjects: true});
  t.equal(result.scannedProjects.length, 1);
  t.equal(result.scannedProjects[0].depTree.name, '.');
  t.equal(result.scannedProjects[0].meta!.gradleProjectName, 'api-configuration');
  t.ok(result.scannedProjects[0].depTree.dependencies!['commons-httpclient:commons-httpclient']);
});

test('multi-project-some-unscannable: allSubProjects fails', async (t) => {
  t.rejects(inspect('.',
    path.join(fixtureDir('multi-project-some-unscannable'), 'build.gradle'), {allSubProjects: true}));
});

test('multi-project-some-unscannable: gradle-sub-project for a good subproject works', async (t) => {
  const options = {
    subProject: 'subproj ',
  };
  const result = await inspect('.',
    path.join(fixtureDir('multi-project-some-unscannable'), 'build.gradle'),
    options);

  t.deepEqual(result.plugin.meta!.allSubProjectNames, ['root-proj', 'subproj', 'subproj-fail']);

  t.match(result.package.name, '/subproj',
    'sub project name is included in the root pkg name');

  t.equal(result.package
    .dependencies!['com.android.tools.build:builder']
    .dependencies!['com.android.tools:sdklib']
    .dependencies!['com.android.tools:repository']
    .dependencies!['com.android.tools:common']
    .dependencies!['com.android.tools:annotations'].version,
  '25.3.0',
  'correct version found');
});

test('allSubProjects incompatible with gradle-sub-project', async (t) => {
  t.rejects(inspect('.',
    path.join(fixtureDir('multi-project'), 'build.gradle'),
    {allSubProjects: true, subProject: true} as api.MultiSubprojectInspectOptions));
});

test('multi-project: parallel with allSubProjects produces multiple results with different names', async (t) => {
  // Note: Gradle has to be run from the directory with `gradle.properties` to pick that one up
  const result = await inspect(fixtureDir('multi-project-parallel'), 'build.gradle', {allSubProjects: true});
  t.equal(result.scannedProjects.length, 6);
  const names = new Set<string>();
  const newNames = new Set<string>();
  for (const p of result.scannedProjects) {
    names.add(p.depTree.name!);
    newNames.add(p.meta!.gradleProjectName);
    t.ok(p.meta!.versionBuildInfo.gradleVersion !== null);
  }
  t.deepEqual(names, new Set<string>([
    'multi-project-parallel',
    'multi-project-parallel/subproj0',
    'multi-project-parallel/subproj1',
    'multi-project-parallel/subproj2',
    'multi-project-parallel/subproj3',
    'multi-project-parallel/subproj4']));
  t.deepEqual(newNames, new Set<string>([
    'root-proj',
    'root-proj/subproj0',
    'root-proj/subproj1',
    'root-proj/subproj2',
    'root-proj/subproj3',
    'root-proj/subproj4']));
});

test('multi-project: allSubProjects + configuration', async (t) => {
  const result = await inspect('.',
    path.join(fixtureDir('multi-project'), 'build.gradle'), {allSubProjects: true, args: ['--configuration', 'compileOnly']});
  // It's an array, so we have to scan
  t.equal(result.scannedProjects.length, 2);
  for (const p of result.scannedProjects) {
    if (p.depTree.name === '.') {
      t.equal(p.meta!.gradleProjectName, 'root-proj', 'new project name');
      t.notOk(p.depTree.dependencies, 'no dependencies for the main depRoot');
      t.notOk(p.targetFile, 'no target file returned'); // see targetFileFilteredForCompatibility
      // TODO(kyegupov): when the project name issue is solved, change the assertion to:
      // t.match(p.targetFile, 'multi-project' + dirSep + 'build.gradle', 'correct targetFile for the main depRoot');
    } else {
      t.equal(p.depTree.name, './subproj',
        'sub project name is included in the root pkg name');
      t.equal(p.meta!.gradleProjectName, 'root-proj/subproj',
          'new sub project name is included in the root pkg name');
      t.equal(p.depTree
        .dependencies!['axis:axis'].version,
      '1.3',
      'correct version found');
      t.notOk(p.depTree
        .dependencies!['com.android.tools.build:builder'],
        'non-compileOnly dependency is not found');
      t.notOk(p.targetFile, 'no target file returned'); // see targetFileFilteredForCompatibility
      // TODO(kyegupov): when the project name issue is solved, change the assertion to:
      // t.match(p.targetFile, 'subproj' + dirSep + 'build.gradle', 'correct targetFile for the main depRoot');
    }
  }
});

test('multi-project-dependency-cycle: scanning the main project works fine', async (t) => {
  const result = await inspect('.',
    path.join(fixtureDir('multi-project-dependency-cycle'), 'build.gradle'),
    {});
  t.equal(result.package.name, '.', 'root project name is "."');
  t.equal(result.meta!.gradleProjectName, 'root-proj', 'new root project name is "root-proj"');
  t.deepEqual(result.plugin.meta!.allSubProjectNames, ['root-proj', 'subproj']);

  t.equal(result.package
    .dependencies!['com.github.jitpack:subproj']
    .dependencies!['com.github.jitpack:root-proj'].version,
  'unspecified',
  'dependency cycle is returned in the results');

  t.notOk(result.package
    .dependencies!['com.github.jitpack:subproj']
    .dependencies!['com.github.jitpack:root-proj'].dependencies,
  'dependency cycle is terminated');

  t.equal(result.package
    .dependencies!['com.github.jitpack:subproj']
    .dependencies!['com.android.tools.build:builder']
    .dependencies!['com.android.tools:sdklib']
    .dependencies!['com.android.tools:repository']
    .dependencies!['com.android.tools:common']
    .dependencies!['com.android.tools:annotations'].version,
  '25.3.0',
  'a dependency chain is found through subproj dependency');
});

test('multi-project-dependency-cycle: scanning all subprojects works fine', async (t) => {
  const result = await inspect('.',
    path.join(fixtureDir('multi-project-dependency-cycle'), 'build.gradle'),
    {allSubProjects: true});
  // It's an array, so we have to scan
  t.equal(result.scannedProjects.length, 2);
  for (const p of result.scannedProjects) {
    if (p.depTree.name === '.') {
      t.equal(p.meta!.gradleProjectName, 'root-proj', 'new project name');
      t.equal(p.depTree
        .dependencies!['com.github.jitpack:subproj']
        .dependencies!['com.github.jitpack:root-proj'].version,
      'unspecified',
      'dependency cycle is returned for the main');
    } else {
      t.equal(p.depTree
        .dependencies!['com.github.jitpack:root-proj']
        .dependencies!['com.github.jitpack:subproj'].version,
      'unspecified',
      'dependency cycle is returned for the subproj');
    }
  }
});
